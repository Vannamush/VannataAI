import { Router, type IRouter } from "express";
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
    const { content, code, language } = parsed.data;

    await db.insert(messages).values({
      conversationId,
      role: "user",
      content,
      mode,
      code: code ?? null,
      language: language ?? null,
    });

    const priorRows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt), asc(messages.id));

    const history = priorRows.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content:
        m.role === "user"
          ? buildUserMessage(m.content, m.code, m.language)
          : m.content,
    }));

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
