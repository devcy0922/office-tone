import type { EndingStyleId, ResolvedEndingStyleId } from "@/lib/ai/types";
import { RESOLVED_ENDING_STYLE_IDS } from "@/lib/ai/types";
import { extractJsonObject } from "@/lib/ai/validator";

export interface GenerationEnvelope {
  validationRaw: string;
  completeModes: boolean;
  resolvedEndingStyle?: ResolvedEndingStyleId;
}

function isResolvedEndingStyle(value: unknown): value is ResolvedEndingStyleId {
  return typeof value === "string" && (RESOLVED_ENDING_STYLE_IDS as readonly string[]).includes(value);
}

export function normalizeGenerationOutput(raw: string): GenerationEnvelope {
  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed !== "object") {
    return { validationRaw: raw, completeModes: false };
  }

  const record = parsed as Record<string, unknown>;
  const resolvedEndingStyle = isResolvedEndingStyle(record.style) ? record.style : undefined;
  const modes = record.modes;

  if (modes && typeof modes === "object" && !Array.isArray(modes)) {
    const modeRecord = modes as Record<string, unknown>;
    const values = [modeRecord.sendable, modeRecord.pointed, modeRecord.inner];
    const completeModes = values.every((value) => typeof value === "string" && value.trim().length > 0);
    if (completeModes) {
      return {
        validationRaw: JSON.stringify({
          v: values,
          kept: Array.isArray(record.kept) ? record.kept : [],
        }),
        completeModes: true,
        resolvedEndingStyle,
      };
    }
  }

  const legacy = Array.isArray(record.v)
    ? record.v.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  return {
    validationRaw: raw,
    completeModes: legacy.length >= 3,
    resolvedEndingStyle,
  };
}

export function endingStyleMatches(requested: EndingStyleId | undefined, resolved: ResolvedEndingStyleId | undefined): boolean {
  if (!resolved) return false;
  if (!requested || requested === "auto") return true;
  return requested === resolved;
}
