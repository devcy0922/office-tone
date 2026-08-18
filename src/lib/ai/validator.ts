import type { ValidationIssue, ValidationResult } from "@/lib/ai/types";
import { MAX_OUTPUT_CHARS } from "@/lib/ai/types";

const CHINESE_PHRASES = /确认|请求|进行|问题|处理|请您|谢谢|的了|这是|我们|吗[？?]/u;
const CHINESE_PARTICLES = /[的这们嗎這們]/u;

const CJK = /[\u4E00-\u9FFF]/u;
const HANGUL = /[\uAC00-\uD7A3]/u;

export function extractJsonObject(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  const slice = candidate.slice(start, end + 1);
  for (const text of [slice, escapeControlsInJsonStrings(slice), slice.replace(/[\u0000-\u001F]/g, " ")]) {
    try {
      return JSON.parse(text);
    } catch {
      continue;
    }
  }
  return null;
}

function escapeControlsInJsonStrings(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') inString = true;
    out += ch;
  }
  return out;
}

export function hasChineseContamination(text: string): boolean {
  if (!text) return false;
  if (CHINESE_PHRASES.test(text)) return true;

  const cjk = text.match(new RegExp(CJK, "gu"))?.length ?? 0;
  const hangul = text.match(new RegExp(HANGUL, "gu"))?.length ?? 0;
  if (cjk >= 2 && hangul === 0) return true;
  if (cjk >= 3 && CHINESE_PARTICLES.test(text) && cjk > hangul * 0.2) return true;
  if (cjk >= 6 && cjk > hangul * 0.35) return true;
  return false;
}

export function hasRepetition(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 24) return false;

  const sentences = compact.split(/(?<=[.!?。]|습니다|해요|입니다)/).filter((s) => s.trim().length >= 8);
  if (sentences.length >= 4) {
    const unique = new Set(sentences.map((s) => s.trim()));
    if (unique.size <= Math.ceil(sentences.length / 3)) return true;
  }

  const window = compact.slice(0, Math.min(80, Math.floor(compact.length / 2)));
  if (window.length >= 20 && compact.indexOf(window, window.length) !== -1) return true;
  return false;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function pickRewritten(parsed: Record<string, unknown>): string {
  for (const key of ["rewritten", "rewined", "rewrite", "calibrated", "message", "text"]) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim() && !value.trim().startsWith("{")) {
      return value.trim();
    }
  }
  return "";
}

export function parseModelOutput(raw: string): { rewritten: string; preserved: string[]; jsonOk: boolean } {
  const parsed = extractJsonObject(raw);
  if (parsed && typeof parsed === "object" && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    const rewritten = stripJsonKeyPrefix(pickRewritten(record));
    const preserved = asStringArray(record.preserved);
    if (rewritten) return { rewritten, preserved, jsonOk: true };
  }

  const loose = extractRewrittenLoose(raw);
  if (loose) {
    return { rewritten: loose, preserved: extractPreservedLoose(raw), jsonOk: false };
  }

  const fallback = koreanParagraphs(raw);
  if (fallback) return { rewritten: fallback, preserved: [], jsonOk: false };

  return { rewritten: "", preserved: [], jsonOk: false };
}

function extractRewrittenLoose(raw: string): string {
  for (const key of ["rewritten", "rewined"]) {
    const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*)`));
    if (!match) continue;
    const rest = match[1];
    const endPreserved = rest.search(/"\s*,\s*"preserved"/i);
    const endBrace = rest.search(/"\s*}/);
    const end = [endPreserved, endBrace].filter((value) => value >= 0).sort((a, b) => a - b)[0];
    if (end === undefined) continue;
    const value = stripJsonKeyPrefix(rest.slice(0, end).replace(/\\n/g, "\n").replace(/\\"/g, '"').trim());
    if (value && !value.startsWith("{")) return value;
  }
  return "";
}

function stripJsonKeyPrefix(value: string): string {
  let text = value.trim();
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(/^(rewritten|rewined|rewned|rewrite)\\?"?\s*:\s*\\?"?/i, "").trim();
    if (next === text) break;
    text = next;
  }
  const hangul = text.search(/[\uAC00-\uD7A3]/);
  if (hangul > 0 && hangul <= 32) text = text.slice(hangul);
  return text.replace(/^"+|"+$/g, "").trim();
}

function extractPreservedLoose(raw: string): string[] {
  const match = raw.match(/"preserved"\s*:\s*(\[[\s\S]*?\])/);
  if (!match) return [];
  try {
    return asStringArray(JSON.parse(escapeControlsInJsonStrings(match[1])));
  } catch {
    return [];
  }
}

function koreanParagraphs(raw: string): string {
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[\s`"'{\[\],:]+|[`"{\[\],]+\s*$/g, "").trim())
    .filter((line) => /[\uAC00-\uD7A3]/.test(line) && line.length >= 8 && !/preserved|rewritten/i.test(line))
    .join("\n")
    .trim();
}

export function validateOutput(raw: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const parsed = parseModelOutput(raw);

  if (!parsed.jsonOk) issues.push("json_parse");

  const rewritten = parsed.rewritten.trim();
  if (!rewritten) issues.push("empty");
  if (rewritten.length > MAX_OUTPUT_CHARS) issues.push("too_long");
  if (hasChineseContamination(rewritten) || parsed.preserved.some(hasChineseContamination)) {
    issues.push("chinese");
  }
  if (hasRepetition(rewritten)) issues.push("repetition");

  const fatalEmpty = issues.includes("empty");
  const shouldRegenerate = issues.includes("chinese") || fatalEmpty;

  return {
    ok: !fatalEmpty && !issues.includes("chinese") && !issues.includes("too_long") && !issues.includes("repetition"),
    rewritten: rewritten.slice(0, MAX_OUTPUT_CHARS),
    preserved: parsed.preserved,
    issues,
    shouldRegenerate,
  };
}
