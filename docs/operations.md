# Cloud Run — Office Tone

GCP project `govail-500114`, region `asia-northeast3`.

## Secrets

`office-tone-govail-api-key` in Secret Manager is mounted as `GOVAIL_API_KEY`.
Do not put the key in source, Docker ENV, or GitHub.

## Deploy

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

## Health

`GET /api/health` returns `{ ok, service, model, provider, baseHost }`.
Application logs include request id, latency, status, model, token usage, validation, retry count.
Raw user text and generated message bodies are not logged.

## Rate limit

In-process, 20 requests / IP / 10 minutes using `X-Forwarded-For` (Cloud Run client IP is the leftmost value).
GoVail still enforces its own key RPM.
