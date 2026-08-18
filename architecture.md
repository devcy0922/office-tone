# 오피스톤 Architecture

```mermaid
flowchart TD
  Browser["Browser — first-screen product UI"]
  Next["Cloud Run — Next.js App Router"]
  Rewrite["POST /api/rewrite"]
  Validator["Output validator"]
  GoVail["GoVail api.govail.cloud/v1"]
  Worker["worker — Qwen3.6 low-latency"]

  Browser -->|"원문 + 3축 파라미터"| Next
  Next --> Rewrite
  Rewrite --> GoVail
  GoVail --> Worker
  Worker --> Validator
  Validator -->|"1회 regenerate on CJK contamination"| GoVail
  Validator -->|"rewritten + preservedPoints"| Browser
```

## Runtime

| Layer | Choice |
| --- | --- |
| App | Next.js App Router, TypeScript, Tailwind, shadcn/ui |
| Hosting | GCP Cloud Run `office-tone` in `govail-500114` / `asia-northeast3` |
| AI | GoVail OpenAI-compatible `/v1/chat/completions` |
| Default model | `worker` (fast Qwen3.6). `reasoning_effort: none` |
| Data | None. No DB, no auth, no message persistence |

## Request path

1. Client sends `{ text, directness, defensiveness, business, intent? }`.
2. Server never forwards user text into the system prompt. User text is the `user` message only.
3. Prompt SSOT: `src/lib/ai/prompts.ts`.
4. Validator checks empty, length, repetition, JSON, Chinese contamination. One regenerate max.
5. Response logs request id, latency, status, model, tokens, validation, retry — never raw text.

## Privacy

Input is processed in-memory for a single request. Application logs omit original and rewritten bodies.
