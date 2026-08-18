# Cloud Run — Office Tone

GCP project `govail-500114`, region `asia-northeast3`.
GitHub: `devcy0922/office-tone`. Public URL: https://office-tone-1037271057097.asia-northeast3.run.app

## Secrets

`office-tone-govail-api-key` in Secret Manager is mounted as `GOVAIL_API_KEY`.
Do not put the key in source, Docker ENV, or GitHub.

## Git

Commit on `main`, then push `origin/main`. Cloud Run does **not** auto-deploy from GitHub; shipping a revision is the `gcloud` flow below, from this workspace after the push.

Do not commit `.env`, `.env.local`, or any file that contains `GOVAIL_API_KEY`.

## Deploy

Build the image from the current tree, then replace the Cloud Run revision.

```bash
gcloud builds submit --tag asia-northeast3-docker.pkg.dev/govail-500114/govail-repo/office-tone:latest --project govail-500114
gcloud run deploy office-tone \
  --image asia-northeast3-docker.pkg.dev/govail-500114/govail-repo/office-tone:latest \
  --project govail-500114 \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3 \
  --set-env-vars GOVAIL_BASE_URL=https://api.govail.cloud/v1,GOVAIL_MODEL=worker,GOVAIL_TIMEOUT_MS=25000 \
  --set-secrets GOVAIL_API_KEY=office-tone-govail-api-key:latest
```

## Smoke

```bash
curl -sS https://office-tone-1037271057097.asia-northeast3.run.app/api/health
```

Expect `{ ok: true, service: "office-tone", provider: "govail", ... }`.

`POST /api/rewrite` body:

```json
{
  "context": "DB 컬럼 미스 내일까지 보고 작성하세요.",
  "rawReply": "개새끼야 니가 만든 거야 씨발새끼야",
  "directness": 80,
  "defensiveness": 90,
  "business": 70
}
```

Response includes `candidates` (2–3 sendable Korean messages) and `preserved`. Axes are 1–99. Application logs include request id, latency, status, model, token usage, validation, retry count. Raw user text and generated message bodies are not logged.

`context` is the counterpart's message. `rawReply` is what the user wants to say back. Do not treat context as the rewrite target. `situation`/`thought` aliases are accepted.

## Health

`GET /api/health` returns `{ ok, service, model, provider, baseHost }`.

## Rate limit

In-process, 20 requests / IP / 10 minutes using `X-Forwarded-For` (Cloud Run client IP is the leftmost value).
GoVail still enforces its own key RPM.
