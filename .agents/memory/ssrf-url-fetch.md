---
name: SSRF guard for server-side URL fetch
description: Any feature that fetches a user-supplied URL server-side must validate against SSRF before fetching.
---

Whenever the server fetches a user-provided URL (e.g. the translate "website" source), it MUST validate the URL before and during the fetch.

**Why:** An unrestricted server-side `fetch(userUrl)` lets an attacker reach internal services, cloud metadata endpoints (169.254.169.254), and loopback — a classic SSRF. Code review flagged this as a release blocker.

**How to apply:**
- Enforce `http:`/`https:` only.
- Resolve the hostname (DNS `lookup(host,{all:true})`) and reject if ANY resolved IP is in a private/loopback/link-local/reserved range (IPv4 and IPv6, including `::ffff:` IPv4-mapped). Block literal `localhost`.
- Follow redirects MANUALLY (`redirect: "manual"`) and re-validate every hop's `Location` — auto-follow would bypass the initial IP check via a redirect to an internal IP.
- Return a clean 4xx on any block; never leak internal responses.
- Reference implementation lives in the api-server anthropic route (`assertPublicUrl` / `fetchWebsiteText`).
