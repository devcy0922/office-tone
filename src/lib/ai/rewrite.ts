import { govailChat, type ChatMessage } from "@/lib/ai/govail";
import {
  buildDeveloperPrompt,
  buildUserPrompt,
  koreanRetryHint,
  roleReversalRetryHint,
  SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { RewriteInput, RewriteOutput } from "@/lib/ai/types";
import { validateOutput } from "@/lib/ai/validator";

export class RewriteError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "RewriteError";
  }
}

export async function rewriteMessage(input: RewriteInput): Promise<RewriteOutput> {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const baseMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "developer", content: buildDeveloperPrompt(input) },
    { role: "user", content: buildUserPrompt(input.context, input.rawReply) },
  ];

  let retryCount = 0;
  let lastModel = "";
  let lastUsage: RewriteTelemetry["usage"];
  let result = await govailChat(baseMessages);
  lastModel = result.model;
  lastUsage = result.usage;
  let validation = validateOutput(result.content, input);

  if (validation.shouldRegenerate) {
    retryCount = 1;
    const hint = validation.issues.includes("role_reversal") ? roleReversalRetryHint() : koreanRetryHint();
    result = await govailChat([...baseMessages, { role: "user", content: hint }]);
    lastModel = result.model;
    lastUsage = result.usage;
    validation = validateOutput(result.content, input);
  }

  if (!validation.ok && validation.rewritten) {
    const blocking = validation.issues.filter((issue) =>
      ["chinese", "role_reversal", "empty", "too_long", "repetition"].includes(issue),
    );
    if (!blocking.length) {
      const hangul = validation.rewritten.match(/[\uAC00-\uD7A3]/gu)?.length ?? 0;
      const cjk = validation.rewritten.match(/[\u4E00-\u9FFF]/gu)?.length ?? 0;
      if (hangul >= 12 && hangul > cjk * 4) {
        validation = { ...validation, ok: true };
      }
    }
  }

  const latencyMs = Date.now() - started;
  const telemetry: RewriteTelemetry = {
    requestId,
    latencyMs,
    status: validation.ok ? "ok" : "validation_failed",
    provider: "govail",
    model: lastModel,
    tokenUsage: lastUsage,
    validation: validation.issues,
    retryCount,
  };
  logRewrite(telemetry);

  if (!validation.ok || !validation.rewritten) {
    console.error(JSON.stringify({ event: "rewrite_failed", requestId, issues: validation.issues, retryCount }));
    throw new RewriteError("톤을 다듬지 못했어요. 잠시 후 다시 한번 해주세요.", 502, "VALIDATION");
  }

  return {
    rewritten: validation.rewritten,
    candidates: validation.candidates.length ? validation.candidates : [validation.rewritten],
    preserved: validation.preserved,
    requestId,
    model: lastModel,
    latencyMs,
    retryCount,
  };
}

interface RewriteTelemetry {
  requestId: string;
  latencyMs: number;
  status: string;
  provider: "govail";
  model: string;
  tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  validation: string[];
  retryCount: number;
}

function logRewrite(telemetry: RewriteTelemetry) {
  console.log(
    JSON.stringify({
      event: "rewrite",
      requestId: telemetry.requestId,
      timestamp: new Date().toISOString(),
      latencyMs: telemetry.latencyMs,
      status: telemetry.status,
      provider: telemetry.provider,
      model: telemetry.model,
      tokenUsage: telemetry.tokenUsage ?? telemetry.usage,
      validation: telemetry.validation,
      retryCount: telemetry.retryCount,
    }),
  );
}
