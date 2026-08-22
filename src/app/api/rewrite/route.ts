import { NextResponse } from "next/server";

import {
  ENDING_STYLE_IDS,
  QUICK_INTENTS,
  REFINEMENTS,
  MAX_INPUT_CHARS,
  TEMPERATURE_MAX,
  TEMPERATURE_MIN,
  TONE_MAX,
  TONE_MIN,
} from "@/lib/ai/types";
import type { EndingStyleId, QuickIntent, Refinement, RewriteInput } from "@/lib/ai/types";
import { DEFAULT_ENDING_STYLE, inferTemperatureFromTone } from "@/lib/ai/generation-contracts";
import { GoVailError } from "@/lib/ai/govail";
import { RewriteError, rewriteMessage } from "@/lib/ai/rewrite";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { copy } from "@/lib/copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function clampTone(value: unknown): number | null {
  return clampNumber(value, TONE_MIN, TONE_MAX);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBody(body: unknown): RewriteInput | { error: string } {
  if (!body || typeof body !== "object") return { error: copy.empty };
  const data = body as Record<string, unknown>;
  const context = asText(data.context) || asText(data.situation);
  const rawReply = asText(data.rawReply) || asText(data.thought) || asText(data.text);
  if (!rawReply) return { error: copy.empty };
  if (context.length + rawReply.length > MAX_INPUT_CHARS) return { error: "메시지가 너무 길어요. 조금 줄여주세요." };

  const directness = clampTone(data.directness);
  const defensiveness = clampTone(data.defensiveness);
  const business = clampTone(data.business);
  if (directness === null || defensiveness === null || business === null) return { error: copy.empty };

  const temperature = data.temperature === undefined
    ? inferTemperatureFromTone({ directness, defensiveness, business })
    : clampNumber(data.temperature, TEMPERATURE_MIN, TEMPERATURE_MAX);
  if (temperature === null) return { error: copy.empty };

  let endingStyle: EndingStyleId = DEFAULT_ENDING_STYLE;
  if (typeof data.endingStyle === "string" && data.endingStyle.trim()) {
    if (!(ENDING_STYLE_IDS as readonly string[]).includes(data.endingStyle)) return { error: copy.empty };
    endingStyle = data.endingStyle as EndingStyleId;
  }

  let intent: QuickIntent | undefined;
  if (typeof data.intent === "string" && data.intent.trim()) {
    if (!(QUICK_INTENTS as readonly string[]).includes(data.intent)) return { error: copy.empty };
    intent = data.intent as QuickIntent;
  }

  let refinement: Refinement | undefined;
  if (typeof data.refinement === "string" && data.refinement.trim()) {
    if (!(REFINEMENTS as readonly string[]).includes(data.refinement)) return { error: copy.empty };
    refinement = data.refinement as Refinement;
  }

  return {
    context,
    rawReply,
    directness,
    defensiveness,
    business,
    temperature,
    endingStyle,
    intent,
    refinement,
  };
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
  if ("error" in parsed) return NextResponse.json({ error: { code: "INVALID", message: parsed.error } }, { status: 400 });

  try {
    return NextResponse.json(await rewriteMessage(parsed));
  } catch (error) {
    if (error instanceof RewriteError || error instanceof GoVailError) {
      return NextResponse.json({ error: { code: error.code, message: copy.error } }, { status: error.status });
    }
    return NextResponse.json({ error: { code: "UPSTREAM", message: copy.error } }, { status: 502 });
  }
}
