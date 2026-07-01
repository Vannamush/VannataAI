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

Three modes: Fix Code (paste buggy code + describe the bug → corrected code + explanation), Edit Code (paste code + describe change → edited code), Generate Files (describe → generated code files). Clickable preloaded examples per mode; past sessions saved in a sidebar; answers render as syntax-highlighted, copyable markdown.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
