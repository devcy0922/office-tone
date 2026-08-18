# Office Tone (오피스톤) — Agent Rules

This file is the project-local override. It inherits global environment rules and **wins on conflict**.

## Environment

- **Editor / this workspace:** macmini (`192.168.0.5`) — `/Users/yooncy/devcy0922_port/office-tone`
- **LLM inference:** GoVail public gateway `https://api.govail.cloud/v1` (never call DGX Spark directly)
- **GCP:** project `govail-500114`, region `asia-northeast3`, Cloud Run service `office-tone`
- **GitHub:** `devcy0922/office-tone`

Do not serve vLLM on this Mac mini. Do not invent new GCP projects.

## Product (one sentence)

오피스톤은 Rewrite가 아니라 **Communication Calibration**이다. 할 말은 그대로 두고, 말의 온도만 맞춘다.

## Identity checks (every change)

- AI must not make the user kinder, more agreeable, or more available than the original text.
- Never invent apology, concession, promise, schedule, or responsibility.
- Three axes (`directness`, `defensiveness`, `business`) are independent 1–99 parameters.
- First screen is the product: raw reply first, optional counterpart context, then sendable candidates. No signup, no `/app`, no chatbot bubbles.
- Context is evidence, not the rewrite target. Never reverse requester and responder.
- Low business stays close to the raw reply. High business keeps the same speech act in a more official register.
- Results must read like a Korean coworker. Do not invent apology, deadline, report, or disciplinary power.
- No DB. No login. Do not log raw user text or generated message body.

## SSOT

1. Read this file and `architecture.md` before changing architecture, providers, or deploy.
2. System prompt lives in `src/lib/ai/prompts.ts` only.
3. GoVail client lives in `src/lib/ai/govail.ts`. Browser never sees the API key.

## Out of scope (MVP)

Login, DB, billing, RAG, agents, MCP, company persona, analytics platform, browser extension.

## Stop conditions

If a change would store user messages, expose GoVail credentials to the client, or turn the product into a chatbot, stop and report.
