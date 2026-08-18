import type { ValidationIssue, ValidationResult } from "@/lib/ai/types";
import { MAX_CANDIDATES, MAX_OUTPUT_CHARS, MIN_CANDIDATES } from "@/lib/ai/types";

const CHINESE_PHRASES = /确认|请求|进行|问题|处理|请您|谢谢|的了|这是|我们|吗[？?]/u;
const CHINESE_PARTICLES = /[的这们嗎這們]/u;

const CJK = /[\u4E00-\u9FFF]/u;
const HANGUL = /[\uAC00-\uD7A3]/u;
const SENTENCE_END = /(?:다|요|까|죠|네|음|니다|세요|[.!?…])\s*$/u;
const MANGLED_KEYS = [
  "rewritten",
  "rewainted",
  "rewined",
  "rewned",
  "rewriteed",
  "rewrite",
  "calibrated",
  "message",
  "text",
];

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

function asStringArray(value: unknown, limit = MAX_CANDIDATES): string[] {
  if (!Array.isArray(value)) return [];
  const mapped = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => (limit === MAX_CANDIDATES ? cleanCandidate(item) : item.trim()))
    .filter(Boolean);
  return mapped.slice(0, limit);
}

function looksLikeMessage(value: string): boolean {
  const text = value.trim();
  if (!text || text.startsWith("{")) return false;
  return /[\uAC00-\uD7A3\u4E00-\u9FFF]/.test(text);
}

export function stripLabelLeak(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return text.trim();

  const kept = lines.filter((line, index) => {
    if (index === 0) return true;
    if (/^(?:[-*]|\d+[.)])\s/.test(line)) return false;
    const shortLabel = line.length <= 18 && !SENTENCE_END.test(line) && !/[.!?…]/.test(line);
    return !shortLabel;
  });
  return kept.join("\n").trim();
}

function stripJsonKeyPrefix(value: string): string {
  let text = value.trim();
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(/^(rewritten|rewainted|rewined|rewned|rewriteed|rewrite)\\?"?\s*:\s*\\?"?/i, "").trim();
    if (next === text) break;
    text = next;
  }
  const hangul = text.search(/[\uAC00-\uD7A3]/);
  if (hangul > 0 && hangul <= 32) text = text.slice(hangul);
  return text.replace(/^"+|"+$/g, "").trim();
}

export function cleanCandidate(value: string): string {
  return stripLabelLeak(stripJsonKeyPrefix(value)).slice(0, MAX_OUTPUT_CHARS);
}

function pickSingle(parsed: Record<string, unknown>): string {
  for (const key of MANGLED_KEYS) {
    const value = parsed[key];
    if (typeof value === "string" && looksLikeMessage(value)) {
      return cleanCandidate(value);
    }
  }
  return "";
}

function pickCandidates(parsed: Record<string, unknown>): string[] {
  for (const key of ["v", "candidates", "variants", "options", "messages"]) {
    const values = asStringArray(parsed[key]).filter(looksLikeMessage);
    if (values.length) return uniqueCandidates(values);
  }

  const abc = ["a", "b", "c"]
    .map((key) => parsed[key])
    .filter((item): item is string => typeof item === "string")
    .map(cleanCandidate)
    .filter(looksLikeMessage);
  if (abc.length >= MIN_CANDIDATES) return uniqueCandidates(abc);

  const single = pickSingle(parsed);
  return single ? [single] : [];
}

function uniqueCandidates(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

export function parseModelOutput(raw: string): { candidates: string[]; preserved: string[]; jsonOk: boolean } {
  const parsed = extractJsonObject(raw);
  if (parsed && typeof parsed === "object" && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    const candidates = pickCandidates(record);
    const preserved = asStringArray(record.kept ?? record.preserved, 6);
    if (candidates.length) return { candidates, preserved, jsonOk: true };
  }

  const loose = extractCandidatesLoose(raw);
  if (loose.length) {
    return { candidates: loose, preserved: extractPreservedLoose(raw), jsonOk: false };
  }

  const fallback = koreanParagraphs(raw);
  if (fallback) return { candidates: [fallback], preserved: [], jsonOk: false };

  return { candidates: [], preserved: [], jsonOk: false };
}

function extractQuotedKoreanStrings(raw: string): string[] {
  const values: string[] = [];
  const pattern = /"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    const value = cleanCandidate(match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
    if (value.length >= 8 && looksLikeMessage(value) && !/^(v|kept|preserved|rewritten)$/i.test(value)) {
      values.push(value);
    }
  }
  return uniqueCandidates(values);
}

function extractCandidatesLoose(raw: string): string[] {
  const arrayMatch = raw.match(/"(?:v|candidates|variants)"\s*:\s*(\[[\s\S]*?\])/i);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(escapeControlsInJsonStrings(arrayMatch[1]));
      const values = asStringArray(parsed).filter(looksLikeMessage);
      if (values.length) return uniqueCandidates(values);
    } catch {
      const quoted = extractQuotedKoreanStrings(arrayMatch[1]);
      if (quoted.length) return quoted;
    }
  }

  for (const key of MANGLED_KEYS) {
    const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*)`));
    if (!match) continue;
    const rest = match[1];
    const endMeta = rest.search(/"\s*,\s*"(preserved|kept|v)"/i);
    const endBrace = rest.search(/"\s*}/);
    const end = [endMeta, endBrace].filter((value) => value >= 0).sort((a, b) => a - b)[0];
    if (end === undefined) continue;
    const value = cleanCandidate(rest.slice(0, end).replace(/\\n/g, "\n").replace(/\\"/g, '"'));
    if (looksLikeMessage(value)) return [value];
  }

  return extractQuotedKoreanStrings(raw).slice(0, MAX_CANDIDATES);
}

function extractPreservedLoose(raw: string): string[] {
  const match = raw.match(/"(?:kept|preserved)"\s*:\s*(\[[\s\S]*?\])/);
  if (!match) return [];
  try {
    return asStringArray(JSON.parse(escapeControlsInJsonStrings(match[1])), 6);
  } catch {
    return [];
  }
}

function koreanParagraphs(raw: string): string {
  return stripLabelLeak(
    raw
      .split(/\n+/)
      .map((line) => line.replace(/^[\s`"'{\[\],:]+|[`"{\[\],]+\s*$/g, "").trim())
      .filter((line) => /[\uAC00-\uD7A3]/.test(line) && line.length >= 8 && !/preserved|rewritten|^kept$/i.test(line))
      .join("\n"),
  );
}

export function validateOutput(raw: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const parsed = parseModelOutput(raw);
  const candidates = parsed.candidates
    .map(cleanCandidate)
    .filter((text) => text && !hasRepetition(text))
    .slice(0, MAX_CANDIDATES);
  const rewritten = (candidates[0] ?? "").trim();

  if (!parsed.jsonOk) issues.push("json_parse");
  if (!rewritten) issues.push("empty");
  if (candidates.some((text) => text.length > MAX_OUTPUT_CHARS)) issues.push("too_long");
  if (
    candidates.some(hasChineseContamination) ||
    parsed.preserved.some(hasChineseContamination)
  ) {
    issues.push("chinese");
  }
  if (parsed.candidates.some(hasRepetition) && !candidates.length) issues.push("repetition");

  const fatalEmpty = issues.includes("empty");
  const shouldRegenerate =
    issues.includes("chinese") || fatalEmpty || candidates.length < MIN_CANDIDATES;

  return {
    ok:
      !fatalEmpty &&
      !issues.includes("chinese") &&
      !issues.includes("too_long") &&
      !issues.includes("repetition"),
    rewritten: rewritten.slice(0, MAX_OUTPUT_CHARS),
    candidates,
    preserved: parsed.preserved,
    issues,
    shouldRegenerate,
  };
}
