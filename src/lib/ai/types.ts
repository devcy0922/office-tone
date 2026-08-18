export interface ToneParameters {
  directness: number;
  defensiveness: number;
  business: number;
}

export const QUICK_INTENTS = ["거절", "재촉", "반박", "일정"] as const;
export type QuickIntent = (typeof QUICK_INTENTS)[number];

export interface RewriteInput {
  context: string;
  rawReply: string;
  directness: number;
  defensiveness: number;
  business: number;
  intent?: QuickIntent;
}

export interface RewriteOutput {
  rewritten: string;
  candidates: string[];
  preserved: string[];
  requestId: string;
  model: string;
  latencyMs: number;
  retryCount: number;
}

export interface GoVailUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface GoVailChatResult {
  content: string;
  model: string;
  usage?: GoVailUsage;
}

export type ValidationIssue =
  | "empty"
  | "too_long"
  | "json_parse"
  | "chinese"
  | "repetition"
  | "role_reversal";

export interface ValidationResult {
  ok: boolean;
  rewritten: string;
  candidates: string[];
  preserved: string[];
  issues: ValidationIssue[];
  shouldRegenerate: boolean;
}

export const TONE_MIN = 1;
export const TONE_MAX = 99;
export const MAX_INPUT_CHARS = 4000;
export const MAX_OUTPUT_CHARS = 2500;
export const MIN_CANDIDATES = 2;
export const MAX_CANDIDATES = 3;
