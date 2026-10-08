# Fieldnote

A small AI query assistant built for the Husqvarna GIS take-home exercise. The intent is deliberately narrow: write a question, receive a clear answer, and handle failure without losing your input.

## What's included

- React 19 + TypeScript workspace with a restrained visual system, keyboard submission, Markdown responses, copy and explicit regeneration.
- Server-side OpenAI Responses integration through Lovable AI Gateway, using `openai/gpt-6-astra`.
- HS256 JWT signature, expiry, issuer, audience, subject and scope validation on every query.
- Client and server input validation; actionable authentication, rate-limit, timeout, provider and connection errors.
- Portable Node 22 backend, Dockerfile and AWS container deployment plan.
- Focused tests for accepted, missing, incorrectly signed and expired JWTs, plus invalid query input.

## Local development

Use Bun 1.3.3+ and Node 22+. Install with `bun install --frozen-lockfile`.

Copy `.env.example` to `.env` and supply `LOVABLE_API_KEY` and `JWT_SECRET` privately. The editor provisions these as server secrets; an exported checkout needs its own configured environment. Generate a local signing key with `openssl rand -hex 32`. No secret should use a `VITE_` prefix.

- `bun run dev` starts the full React/TanStack app.
- `bunx tsx --env-file=.env backend/server.ts` starts the standalone HTTP backend on port 3000.
- `bun run test` runs the tests.
- `bun run build` builds the hosted frontend application.

The preview invokes typed server functions. The separate HTTP backend is a portable entry point for the container, not a second UI. Both call the same JWT, validation and AI modules. Moving the complete frontend to AWS would require replacing its RPC transport with the HTTP contract below and publishing its assets; this is documented as deployment work rather than claiming the Dockerfile contains the frontend.

## HTTP API (container)

`GET /health` returns `{ "status": "ok" }`.

`POST /session` issues a one-hour **test** JWT. Obtain it programmatically and retain it only in memory.

`POST /query`, with `Authorization: Bearer <session token>` and `Content-Type: application/json`, accepts `{ "query": "Explain JWT authentication" }`. A successful response contains `answer` (Markdown) and `elapsedMs`. Errors have `{ "error": "…" }` and an appropriate status: 400 invalid input, 401 unauthorized, 413 excessive body, 429 rate limit, 499 stopped request, or upstream failure status.

The frontend has no persistence: recent independent queries live only in React state. Reloading clears them. No database tables or personal accounts are needed.

## Container

```sh
docker build -t fieldnote-api .
docker run --rm --env-file .env -p 3000:3000 fieldnote-api
```

The Docker build bundles the backend and dependencies with Bun, then runs a single artifact under an unprivileged Node user. The real `.env` is excluded from the context. Docker itself was unavailable in the development sandbox, so container launch needs verification on a Docker host.

## Decisions and limitations

**Test auth is not real identity.** The brief explicitly permits a test token. This implementation issues a signed, expiring token instead of embedding one. The public session issuer means anyone can obtain demo access: JWT validation is demonstrated, but this is not user access control. Do not expose this unrestricted issuer with a paid model in production; replace it with an identity provider, add per-user quotas and a durable rate limiter first.

**One question at a time.** No conversation history is sent to the model. The sidebar is a session result list, not multi-turn chat. This avoids ambiguous follow-up context and keeps the exercise small.

**Streaming upstream, final answer downstream.** The SDK consumes a real streamed response on the server; this query UI displays the final answer. There is no fabricated typing, canned fallback, automatic retry or artificial time limit. Host/upstream timeouts are reported; explicit Stop aborts the caller request. A disconnected transport may not always stop already-started provider work, so true end-to-end cancellation and browser streaming are worthwhile next steps.

**No unnecessary infrastructure.** Cloud is connected for server secrets and execution; no conversation database, profiles or signup flow were added. The portable Node backend does not require Cloud database credentials.

**AI output is untrusted.** Markdown is rendered without raw HTML. Provider response bodies, prompts and secrets are not logged. Important answers still need human verification.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the AWS approach.
