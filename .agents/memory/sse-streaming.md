---
name: SSE streaming for AI responses
description: How the AI send-message endpoint streams and how the client must consume it in this Orval-codegen repo
---

# SSE streaming pattern (AI chat/code endpoints)

The send-message endpoint (`POST .../conversations/:id/messages`) streams via
`text/event-stream` and deliberately has **no generated React Query hook** — Orval
cannot model an SSE body. Any "send a prompt, stream the answer" endpoint must be
consumed with `fetch` + `ReadableStream` on the client, not a generated hook.

**Wire format:** each event is `data: <json>\n\n` where json is one of
`{"content": "<delta>"}`, `{"done": true}`, or `{"error": "<msg>"}`.

**Why:** the backend uses `anthropic.messages.stream()` and forwards `text` deltas.
On failure it emits an `{error}` frame (and persists any partial output) instead of
crashing the response.

**How to apply:**
- Client parser must split on `\r?\n\r?\n`, keep the trailing partial in a buffer,
  join multi-line `data:` fields, and handle all three frame types — including
  `error`, or failures are silent.
- Keep the endpoint in the OpenAPI spec (so params/body schemas generate) but expect
  its response to be `unknown`; do the streaming by hand.
