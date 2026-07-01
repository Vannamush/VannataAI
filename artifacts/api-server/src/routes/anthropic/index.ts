import { Router, type IRouter } from "express";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { asc, desc, eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  ListExamplesResponse,
  ListAnthropicConversationsResponse,
  CreateAnthropicConversationBody,
  CreateAnthropicConversationResponse,
  GetAnthropicConversationParams,
  GetAnthropicConversationResponse,
  DeleteAnthropicConversationParams,
  ListAnthropicMessagesParams,
  ListAnthropicMessagesResponse,
  SendAnthropicMessageParams,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";
import { EXAMPLES } from "../../lib/examples";
import {
  buildSystemPrompt,
  buildUserMessage,
  type AssistantMode,
} from "../../lib/codeAssistant";

const router: IRouter = Router();

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;
const MAX_WEBSITE_CHARS = 12000;

function ipToLong(ip: string): number {
  return (
    ip.split(".").reduce((acc, o) => (acc << 8) + parseInt(o, 10), 0) >>> 0
  );
}

function isPrivateIPv4(ip: string): boolean {
  const long = ipToLong(ip);
  const inRange = (base: string, bits: number): boolean => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (ipToLong(base) & mask);
  };
  return (
    inRange("0.0.0.0", 8) ||
    inRange("10.0.0.0", 8) ||
    inRange("100.64.0.0", 10) ||
    inRange("127.0.0.0", 8) ||
    inRange("169.254.0.0", 16) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.0.0.0", 24) ||
    inRange("192.168.0.0", 16) ||
    inRange("198.18.0.0", 15) ||
    inRange("224.0.0.0", 4) ||
    inRange("240.0.0.0", 4)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === "::1" || addr === "::") return true;
  if (/^f[cd]/.test(addr)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(addr)) return true; // link-local fe80::/10
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isBlockedIp(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true;
}

async function assertPublicUrl(raw: string): Promise<string> {
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(normalized);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host.toLowerCase() === "localhost") {
    throw new Error("Blocked host");
  }
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error("Blocked IP address");
  } else {
    const results = await lookup(host, { all: true });
    if (results.length === 0) throw new Error("Could not resolve host");
    for (const r of results) {
      if (isBlockedIp(r.address)) throw new Error("Blocked IP address");
    }
  }
  return normalized;
}

async function fetchWebsiteText(url: string): Promise<string> {
  const normalized = await assertPublicUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    // Follow redirects manually, re-validating each hop against SSRF ranges.
    let current = normalized;
    let resp: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      const r = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (VanntaiTest translate bot)" },
      });
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get("location");
        if (!location) throw new Error("Redirect without a location");
        current = await assertPublicUrl(new URL(location, current).toString());
        continue;
      }
      resp = r;
      break;
    }
    if (!resp) {
      throw new Error("Too many redirects");
    }
    if (!resp.ok) {
      throw new Error(`Request failed with status ${resp.status}`);
    }
    const html = await resp.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      throw new Error("No readable text found on the page");
    }
    return text.slice(0, MAX_WEBSITE_CHARS);
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/anthropic/examples", async (_req, res): Promise<void> => {
  res.json(ListExamplesResponse.parse(EXAMPLES));
});

router.get("/anthropic/conversations", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(ListAnthropicConversationsResponse.parse(rows));
});

router.post("/anthropic/conversations", async (req, res): Promise<void> => {
  const parsed = CreateAnthropicConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(conversations)
    .values({ title: parsed.data.title, mode: parsed.data.mode })
    .returning();
  res.status(201).json(CreateAnthropicConversationResponse.parse(row));
});

router.get(
  "/anthropic/conversations/:id",
  async (req, res): Promise<void> => {
    const params = GetAnthropicConversationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(asc(messages.createdAt), asc(messages.id));
    res.json(
      GetAnthropicConversationResponse.parse({ ...row, messages: msgs }),
    );
  },
);

router.delete(
  "/anthropic/conversations/:id",
  async (req, res): Promise<void> => {
    const params = DeleteAnthropicConversationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .delete(conversations)
      .where(eq(conversations.id, params.data.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.sendStatus(204);
  },
);

router.get(
  "/anthropic/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const params = ListAnthropicMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(asc(messages.createdAt), asc(messages.id));
    res.json(ListAnthropicMessagesResponse.parse(rows));
  },
);

router.post(
  "/anthropic/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const params = SendAnthropicMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SendAnthropicMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const conversationId = params.data.id;
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const mode = parsed.data.mode as AssistantMode;
    const { content, language, image, imageMediaType, sourceUrl } = parsed.data;
    let { code } = parsed.data;

    // Website source: fetch the page server-side and translate its text.
    if (sourceUrl && sourceUrl.trim().length > 0) {
      try {
        const fetched = await fetchWebsiteText(sourceUrl.trim());
        code = fetched;
      } catch (err) {
        req.log.error({ err, sourceUrl }, "Website fetch failed");
        res.status(400).json({
          error: "Could not fetch that website. Check the URL and try again.",
        });
        return;
      }
    }

    // Prior conversation history (before the new user message).
    const priorRows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt), asc(messages.id));

    const hasImage =
      typeof image === "string" &&
      image.length > 0 &&
      typeof imageMediaType === "string" &&
      imageMediaType.length > 0;

    // Persist the new user message. For images we store a marker (bytes aren't kept).
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content,
      mode,
      code: hasImage ? null : (code ?? null),
      language: language ?? null,
    });

    type MessageParam = Parameters<
      typeof anthropic.messages.stream
    >[0]["messages"][number];

    const history: MessageParam[] = priorRows.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content:
        m.role === "user"
          ? buildUserMessage(m.content, m.code, m.language)
          : m.content,
    }));

    if (hasImage) {
      history.push({
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: imageMediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: image,
            },
          },
          { type: "text", text: content },
        ],
      });
    } else {
      history.push({
        role: "user",
        content: buildUserMessage(content, code ?? null, language ?? null),
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let full = "";
    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(mode),
        messages: history,
      });

      stream.on("text", (delta) => {
        full += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      });

      await stream.finalMessage();

      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: full,
        mode,
        code: null,
        language: null,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      req.log.error({ err }, "Anthropic stream failed");
      if (full.trim().length > 0) {
        await db.insert(messages).values({
          conversationId,
          role: "assistant",
          content: full,
          mode,
          code: null,
          language: null,
        });
      }
      res.write(
        `data: ${JSON.stringify({ error: "The AI request failed. Please try again." })}\n\n`,
      );
      res.end();
    }
  },
);

export default router;
