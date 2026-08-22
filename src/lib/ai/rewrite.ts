import { govailChat, type ChatMessage } from "@/lib/ai/govail";
import {
  DEFAULT_ENDING_STYLE,
  inferTemperatureFromTone,
  temperatureBandFor,
} from "@/lib/ai/generation-contracts";
import {
  endingStyleMatches,
  endingStyleSurfaceMatches,
  normalizeGenerationOutput,
} from "@/lib/ai/generation-output";
import {
  buildDeveloperPrompt,
  buildUserPrompt,
  koreanRetryHint,
  roleReversalRetryHint,
  SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { inferCommunicationMeta } from "@/lib/ai/meta";
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

function generationContractSatisfied(
  input: RewriteInput,
  candidates: string[],
  envelope: ReturnType<typeof normalizeGenerationOutput>,
): boolean {
  if (!envelope.completeModes || candidates.length !== 3 || !envelope.resolvedEndingStyle) return false;
  if (!endingStyleMatches(input.endingStyle, envelope.resolvedEndingStyle)) return false;
  return candidates.every((candidate) => endingStyleSurfaceMatches(candidate, envelope.resolvedEndingStyle!));
}

export async function rewriteMessage(input: RewriteInput): Promise<RewriteOutput> {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const temperature = input.temperature ?? inferTemperatureFromTone(input);
  const endingStyle = input.endingStyle ?? DEFAULT_ENDING_STYLE;
  const normalizedInput: RewriteInput = {
    ...input,
    temperature,
    endingStyle,
  };
  const band = temperatureBandFor(temperature);

  const baseMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "developer", content: buildDeveloperPrompt(normalizedInput) },
    { role: "user", content: buildUserPrompt(normalizedInput.context, normalizedInput.rawReply) },
  ];

  let retryCount = 0;
  let lastModel = "";
  let lastUsage: RewriteTelemetry["usage"];
  let result = await govailChat(baseMessages);
  lastModel = result.model;
  lastUsage = result.usage;

  let envelope = normalizeGenerationOutput(result.content);
  let validation = validateOutput(envelope.validationRaw, normalizedInput);
  let generationContractOk = generationContractSatisfied(normalizedInput, validation.candidates, envelope);

  if (validation.shouldRegenerate || !generationContractOk) {
    retryCount = 1;
    const hint = validation.issues.includes("role_reversal")
      ? roleReversalRetryHint()
      : `${koreanRetryHint()} 이전 응답은 세 결과 모드 또는 실제 종결 style 계약도 충족하지 못했다. 세 모드를 빠짐없이 서로 다른 전략으로 작성하고 선택한 말끝을 문장 전체에서 섞지 마라.`;
    result = await govailChat([...baseMessages, { role: "user", content: hint }]);
    lastModel = result.model;
    lastUsage = result.usage;
    envelope = normalizeGenerationOutput(result.content);
    validation = validateOutput(envelope.validationRaw, normalizedInput);
    generationContractOk = generationContractSatisfied(normalizedInput, validation.candidates, envelope);
  }

  if (!validation.ok && validation.rewritten && generationContractOk) {
    const blocking = validation.issues.filter((issue) =>
      ["chinese", "role_reversal", "empty", "too_long", "repetition"].includes(issue),
    );
    if (!blocking.length) {
      const hangul = validation.rewritten.match(/[\uAC00-\uD7A3]/gu)?.length ?? 0;
      const cjk = validation.rewritten.match(/[\u4E00-\u9FFF]/gu)?.length ?? 0;
      if (hangul >= 12 && hangul > cjk * 4) validation = { ...validation, ok: true };
    }
  }

  const latencyMs = Date.now() - started;
  const telemetry: RewriteTelemetry = {
    requestId,
    latencyMs,
    status: validation.ok && generationContractOk ? "ok" : "validation_failed",
    provider: "govail",
    model: lastModel,
    tokenUsage: lastUsage,
    validation: generationContractOk ? validation.issues : [...validation.issues, "generation_contract"],
    retryCount,
  };
  logRewrite(telemetry);

  if (!validation.ok || !generationContractOk || validation.candidates.length < 3 || !envelope.resolvedEndingStyle) {
    console.error(JSON.stringify({
      event: "rewrite_failed",
      requestId,
      issues: telemetry.validation,
      retryCount,
    }));
    throw new RewriteError("톤을 다듬지 못했어요. 잠시 후 다시 한번 해주세요.", 502, "VALIDATION");
  }

  const [sendable, pointed, inner] = validation.candidates;
  return {
    rewritten: sendable,
    candidates: [sendable, pointed, inner],
    results: { sendable, pointed, inner },
    preserved: validation.preserved,
    endingStyle: envelope.resolvedEndingStyle,
    temperatureBand: band.label,
    requestId,
    model: lastModel,
    latencyMs,
    retryCount,
    meta: inferCommunicationMeta(normalizedInput),
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
  console.log(JSON.stringify({
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
  }));
}
