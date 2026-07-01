# Vanntai Test

An AI coding assistant that fixes broken code, edits/refactors code to a request, and generates new code files from a description — results stream back as syntax-highlighted, copyable code blocks.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract source of truth: `lib/api-spec/openapi.yaml` (run codegen after edits)
- DB schema: `lib/db/src/schema/{conversations,messages}.ts`
- Backend routes: `artifacts/api-server/src/routes/anthropic/index.ts`
- AI prompts per mode: `artifacts/api-server/src/lib/codeAssistant.ts`
- Preloaded examples: `artifacts/api-server/src/lib/examples.ts`
- Frontend app: `artifacts/vanntai-test/src/` (`pages/Home.tsx`, `hooks/use-stream.ts`, `components/Markdown.tsx`)

## Architecture decisions

- AI is powered by Replit's Anthropic AI integration (model `claude-sonnet-4-6`); no user API key. Env: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (do not modify).
- The bundle contained no ML model, so the "trained model" is a mode-specific system prompt (fix/edit/generate) over Claude.
- The send-message endpoint streams via SSE (`text/event-stream`) and has no generated hook — the client uses fetch + ReadableStream (`hooks/use-stream.ts`). SSE frames are `data: {"content"|"done"|"error": ...}`.
- No auth: single-purpose tool, all conversations are global by design.

## Product

Seven modes: Fix Code, Edit Code, Generate Files, Translate (translate the human-readable text — comments/docstrings/prose — into a spoken/human language, leaving code intact), Explain, Document (add comments/docstrings), and Tests (generate unit tests). Each mode has its own system prompt (`codeAssistant.ts`) and preloaded examples. New modes are added by extending the `mode` enum in `openapi.yaml` (+ codegen), `AssistantMode`/`MODE_INSTRUCTIONS` in `codeAssistant.ts`, examples, and the `MODES` config in `Home.tsx`.

Two independent language selectors, driven per-mode by `showCodeLang`/`showHumanLang` flags on the `MODES` config: a coding-language input (fix/edit/document/test) and a spoken/human-language dropdown. The chosen human language is folded into the message content client-side (both new conversations via `buildContent` and follow-ups in `handleSubmit`) — no schema change. Past sessions saved in a sidebar; answers render as syntax-highlighted, copyable markdown.

Explain mode has a Spoken/Code toggle (`explainLangKind` state): "Spoken" shows the human dropdown and asks the AI to respond in that language; "Code" shows the coding-language input and responds in English.

Translate mode supports four input sources (`translateSource` state: `text`|`file`|`image`|`website`), chosen via source-picker buttons, each translated into the selected human language:
- `text` — pasted text/code.
- `file` — a text file read client-side (FileReader → text into `code`).
- `image` — read as base64 (FileReader.readAsDataURL, data-URI prefix stripped) into `imageData`/`imageMediaType`; sent to Claude as a vision content block. Image bytes are NOT persisted (DB stores a null `code`), so translate is effectively single-shot for images.
- `website` — a URL fetched server-side by `fetchWebsiteText()` (strips HTML tags/entities, 15s timeout, 12000 char cap). URLs are validated by `assertPublicUrl()` for SSRF safety: http/https only, and every resolved IP (plus each redirect hop, followed manually) is checked against private/loopback/link-local/reserved ranges; blocked or unreachable hosts return 400.

Backend `AnthropicMessageInput` (openapi.yaml) carries `image`, `imageMediaType`, `sourceUrl`. Conversation history is built from prior rows BEFORE inserting the current user message, then the current message is appended.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
