import type { ToneParameters } from "@/lib/ai/types";

export const PRESETS = [
  { id: "kind", label: "최대한 좋게 말해요", directness: 20, defensiveness: 30, business: 65 },
  { id: "neutral", label: "무난하게 말해요", directness: 50, defensiveness: 50, business: 60 },
  { id: "boundary", label: "선은 그을게요", directness: 55, defensiveness: 85, business: 70 },
  { id: "clear", label: "확실하게 말해요", directness: 80, defensiveness: 70, business: 65 },
  { id: "today", label: "오늘은 참지 않아요", directness: 99, defensiveness: 80, business: 40 },
] as const satisfies ReadonlyArray<{ id: string; label: string } & ToneParameters>;

export const DEFAULT_TONE: ToneParameters = {
  directness: 50,
  defensiveness: 50,
  business: 60,
};
