import { NextResponse } from "next/server";

import { QUICK_INTENTS, MAX_INPUT_CHARS, TONE_MAX, TONE_MIN } from "@/lib/ai/types";
import type { QuickIntent, RewriteInput } from "@/lib/ai/types";
import { GoVailError } from "@/lib/ai/govail";
import { RewriteError, rewriteMessage } from "@/lib/ai/rewrite";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { copy } from "@/lib/copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampTone(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < TONE_MIN || rounded > TONE_MAX) return null;
  return rounded;
}

function parseBody(body: unknown): RewriteInput | { error: string } {
  if (!body || typeof body !== "object") return { error: copy.empty };
  const data = body as Record<string, unknown>;
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) return { error: copy.empty };
  if (text.length > MAX_INPUT_CHARS) return { error: "메시지가 너무 길어요. 조금 줄여주세요." };

  const directness = clampTone(data.directness);
  const defensiveness = clampTone(data.defensiveness);
  const business = clampTone(data.business);
  if (directness === null || defensiveness === null || business === null) {
    return { error: copy.empty };
  }

  let intent: QuickIntent | undefined;
  if (typeof data.intent === "string" && data.intent.trim()) {
    if (!(QUICK_INTENTS as readonly string[]).includes(data.intent)) {
      return { error: copy.empty };
    }
    intent = data.intent as QuickIntent;
  }

  return { text, directness, defensiveness, business, intent };
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = consumeRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: copy.error } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID", message: copy.empty } }, { status: 400 });
  }

  const parsed = parseBody(json);
  if ("error" in parsed) {
    return NextResponse.json({ error: { code: "INVALID", message: parsed.error } }, { status: 400 });
  }

  try {
    const result = await rewriteMessage(parsed);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RewriteError || error instanceof GoVailError) {
      return NextResponse.json(
        { error: { code: error.code, message: copy.error } },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: { code: "UPSTREAM", message: copy.error } }, { status: 502 });
  }
}
