import type { ToneParameters } from "@/lib/ai/types";

export const PRESETS = [
  {
    id: "kind",
    label: "최대한 좋게",
    description: "관계는 지키고, 하고 싶은 말은 남겨요.",
    directness: 18,
    defensiveness: 28,
    business: 62,
  },
  {
    id: "neutral",
    label: "무난하게",
    description: "대부분의 회사 대화에 안전한 기본 온도예요.",
    directness: 50,
    defensiveness: 50,
    business: 58,
  },
  {
    id: "boundary",
    label: "선은 그을게요",
    description: "책임과 조건을 흐리지 않고 분명히 남겨요.",
    directness: 62,
    defensiveness: 88,
    business: 68,
  },
  {
    id: "clear",
    label: "확실하게",
    description: "결론부터 말하고 돌려 말하지 않아요.",
    directness: 84,
    defensiveness: 72,
    business: 58,
  },
  {
    id: "today",
    label: "오늘은 참지 않아요",
    description: "욕은 빼도, 불편함과 경계는 숨기지 않아요.",
    directness: 99,
    defensiveness: 90,
    business: 26,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
} & ToneParameters>;

export const DEFAULT_TONE: ToneParameters = {
  directness: 50,
  defensiveness: 50,
  business: 58,
};
