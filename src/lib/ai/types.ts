export interface ToneParameters {
  directness: number;
  defensiveness: number;
  business: number;
}

export const ENDING_STYLE_IDS = ["auto", "yo", "formal", "plain"] as const;
export type EndingStyleId = (typeof ENDING_STYLE_IDS)[number];

export const RESOLVED_ENDING_STYLE_IDS = ["yo", "formal", "plain"] as const;
export type ResolvedEndingStyleId = (typeof RESOLVED_ENDING_STYLE_IDS)[number];

export const OUTPUT_MODE_IDS = ["sendable", "pointed", "inner"] as const;
export type OutputModeId = (typeof OUTPUT_MODE_IDS)[number];
export type RewriteModeResults = Record<OutputModeId, string>;

export const QUICK_INTENTS = ["거절", "재촉", "반박", "일정", "책임 경계", "요청", "확인"] as const;
export type QuickIntent = (typeof QUICK_INTENTS)[number];

export const REFINEMENTS = ["softer", "firmer", "shorter", "politer"] as const;
export type Refinement = (typeof REFINEMENTS)[number];

export interface CommunicationMeta {
  intent: string;
  audience: string;
}

export interface RewriteInput {
  context: string;
  rawReply: string;
  directness: number;
  defensiveness: number;
  business: number;
  /** Product expression intensity. Kept separate from the three fine-grained tone sliders. */
  temperature?: number;
  /** Requested Korean utterance style. `auto` asks the model to return the selected style. */
  endingStyle?: EndingStyleId;
  intent?: QuickIntent;
  refinement?: Refinement;
}

export interface RewriteOutput {
  rewritten: string;
  candidates: string[];
  results: RewriteModeResults;
  preserved: string[];
  endingStyle: ResolvedEndingStyleId;
  temperatureBand: string;
  requestId: string;
  model: string;
  latencyMs: number;
  retryCount: number;
  meta: CommunicationMeta;
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
  /** Optional structured generation metadata for forward-compatible validators. */
  modes?: Partial<RewriteModeResults>;
  resolvedEndingStyle?: ResolvedEndingStyleId;
}

export const TONE_MIN = 1;
export const TONE_MAX = 99;
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 100;
export const MAX_INPUT_CHARS = 4000;
export const MAX_OUTPUT_CHARS = 2500;
export const MIN_CANDIDATES = 2;
export const MAX_CANDIDATES = 3;
