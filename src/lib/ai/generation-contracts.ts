import type {
  EndingStyleId,
  OutputModeId,
  ResolvedEndingStyleId,
  ToneParameters,
} from "@/lib/ai/types";
import { TEMPERATURE_MAX, TEMPERATURE_MIN } from "@/lib/ai/types";

export interface TemperatureBand {
  id: "kind" | "neutral" | "boundary" | "clear" | "today";
  min: number;
  max: number;
  value: number;
  label: string;
  description: string;
  tone: ToneParameters;
  generationContract: readonly string[];
  allowedDevices: readonly string[];
  forbiddenSofteners: readonly string[];
}

export interface EndingStyleContract {
  id: EndingStyleId;
  label: string;
  shortLabel: string;
  usage: string;
  generationContract: readonly string[];
}

export interface OutputModeContract {
  id: OutputModeId;
  label: string;
  description: string;
  generationContract: readonly string[];
}

export const TEMPERATURE_BANDS: readonly TemperatureBand[] = [
  {
    id: "kind",
    min: 0,
    max: 20,
    value: 15,
    label: "최대한 좋게",
    description: "관계는 지키고, 하고 싶은 말은 남겨요.",
    tone: { directness: 18, defensiveness: 28, business: 62 },
    generationContract: [
      "관계 보호를 우선하되 사용자의 핵심 주장과 사실관계를 삭제하지 않는다.",
      "완곡한 요청과 협조 표현을 사용할 수 있지만 거절/책임 경계를 수락으로 바꾸지 않는다.",
      "사용자가 하지 않은 사과, 감사, 양보를 새로 추가하지 않는다.",
    ],
    allowedDevices: ["완곡한 요청", "협조 제안", "부드러운 연결어"],
    forbiddenSofteners: [],
  },
  {
    id: "neutral",
    min: 21,
    max: 40,
    value: 35,
    label: "무난하게",
    description: "대부분의 회사 대화에 자연스러운 기본 온도예요.",
    tone: { directness: 50, defensiveness: 50, business: 58 },
    generationContract: [
      "일반적인 회사 대화처럼 자연스럽게 쓴다.",
      "주장과 요청을 명확히 유지하고 불필요한 감정 표현만 정리한다.",
      "모범답안처럼 지나치게 정중한 공문체로 평준화하지 않는다.",
    ],
    allowedDevices: ["간결한 설명", "명확한 요청", "자연스러운 존댓말"],
    forbiddenSofteners: [],
  },
  {
    id: "boundary",
    min: 41,
    max: 60,
    value: 55,
    label: "선은 그을게요",
    description: "책임과 조건을 흐리지 않고 분명히 남겨요.",
    tone: { directness: 62, defensiveness: 88, business: 68 },
    generationContract: [
      "책임 범위, 조건, 기한, 거절을 문장 표면에 명시한다.",
      "무엇을 수용하지 않는지 분명히 말하고 불필요한 쿠션어를 줄인다.",
      "함께 해결하자는 표현 때문에 사용자의 책임 경계가 흐려지지 않게 한다.",
    ],
    allowedDevices: ["책임 경계", "조건 명시", "명시적 거절"],
    forbiddenSofteners: ["어려울 것 같습니다"],
  },
  {
    id: "clear",
    min: 61,
    max: 80,
    value: 75,
    label: "확실하게",
    description: "결론부터 말하고 잘못과 책임 전가를 직접 짚어요.",
    tone: { directness: 84, defensiveness: 72, business: 58 },
    generationContract: [
      "결론을 먼저 말하고 잘못, 책임 전가, 반복 문제를 직접 지적할 수 있다.",
      "경고와 후속 조치 요구를 허용하며 짧고 강한 종결문을 적극 사용한다.",
      "불편한 핵심을 상투적인 업무 문구 뒤에 숨기지 않는다.",
    ],
    allowedDevices: ["직접 지적", "경고", "후속 조치 요구", "짧은 종결문"],
    forbiddenSofteners: ["적절하지 않습니다", "확인 부탁드립니다", "재검토해 주세요"],
  },
  {
    id: "today",
    min: 81,
    max: 100,
    value: 95,
    label: "오늘은 참지 않아요",
    description: "분노와 억울함을 숨기지 않고 직설·풍자까지 허용해요.",
    tone: { directness: 99, defensiveness: 90, business: 26 },
    generationContract: [
      "원문의 분노, 억울함, 불쾌감과 책임 거부를 숨기지 않는다.",
      "직접 비판, 냉소, 풍자, 비유와 압박감 있는 문장을 적극 사용할 수 있다.",
      "로컬 모델이 자동으로 정중한 회사 문장으로 순화하지 못하게 강한 어휘와 리듬을 유지한다.",
      "원문에 없는 사실, 협박, 차별, 신상 공격은 새로 만들지 않는다.",
    ],
    allowedDevices: ["직접 비판", "냉소", "풍자", "비유", "압박감 있는 질문", "짧은 종결문"],
    forbiddenSofteners: [
      "적절하지 않습니다",
      "확인 부탁드립니다",
      "재검토해 주세요",
      "어려울 것 같습니다",
      "담당 범위를 확인해 주세요",
    ],
  },
] as const;

export const ENDING_STYLES: readonly EndingStyleContract[] = [
  {
    id: "auto",
    label: "자동",
    shortLabel: "자동",
    usage: "상대 관계와 결과 목적을 보고 yo/formal/plain 중 하나를 선택한다.",
    generationContract: [
      "세 결과 모두 같은 종결 스타일을 사용한다.",
      "최종 선택한 실제 스타일을 JSON style 필드에 yo/formal/plain 중 하나로 반환한다.",
    ],
  },
  {
    id: "yo",
    label: "요",
    shortLabel: "요체",
    usage: "메신저와 동료 대화에 자연스러운 해요체",
    generationContract: [
      "해요체를 사용하되 부드러움과 공격성을 혼동하지 않는다.",
      "고온에서는 요체로도 충분히 단호하게 말한다.",
      "어휘와 문장 리듬도 대화형으로 구성하고 합니다/한다체를 섞지 않는다.",
    ],
  },
  {
    id: "formal",
    label: "합니다·습니다",
    shortLabel: "합니다체",
    usage: "상사, 고객, 공식 기록에 맞는 공식 단정형",
    generationContract: [
      "합니다/습니다/주십시오 계열의 공식 단정형을 일관되게 사용한다.",
      "격식이 있다는 이유로 주장이나 경고를 약화하지 않는다.",
      "사실, 책임, 요구가 기록으로 남는 느낌의 문장 구조를 사용한다.",
    ],
  },
  {
    id: "plain",
    label: "한다·다",
    shortLabel: "한다체",
    usage: "공유 카드, 독백, 선언문에 맞는 짧은 직설형",
    generationContract: [
      "한다/다 계열로 짧고 단정적으로 쓴다.",
      "쿠션어를 줄이고 선언문처럼 리듬과 카타르시스를 살린다.",
      "요체나 합니다체를 의도 없이 섞지 않는다.",
    ],
  },
] as const;

export const OUTPUT_MODES: readonly OutputModeContract[] = [
  {
    id: "sendable",
    label: "실제로 보내기",
    description: "현실적으로 전송 가능한 문장",
    generationContract: [
      "실제 업무 메시지로 전송 가능해야 한다.",
      "고온에서도 강한 경계, 거절, 책임 지적을 숨기지 않는다.",
      "원문의 욕설은 그대로 복제하지 말고 의미와 감정 에너지를 직설적인 업무 언어로 변환한다.",
    ],
  },
  {
    id: "pointed",
    label: "뼈 있게 보내기",
    description: "위트·냉소·비유가 있는 기억나는 문장",
    generationContract: [
      "위트, 냉소, 풍자, 비유 또는 기억에 남는 한 문장을 최소 하나 사용한다.",
      "sendable과 단순 동의어 치환이 아니라 문장 전략과 리듬을 바꾼다.",
      "원문의 욕설은 풍자나 비유로 바꿀 수 있지만 새로운 모욕을 만들지 않는다.",
    ],
  },
  {
    id: "inner",
    label: "내 속마음",
    description: "공유/카타르시스용, 실제 전송용과 분리",
    generationContract: [
      "사용자의 감정 에너지를 가장 적게 순화하고 카타르시스를 우선한다.",
      "사용자가 직접 입력한 욕설은 필요하면 보존할 수 있다. 욕설 때문에 거부하거나 훈계하지 않는다.",
      "사용자가 쓰지 않은 더 강한 욕설, 협박, 차별, 신상 공격은 새로 추가하지 않는다.",
    ],
  },
] as const;

export const DEFAULT_TEMPERATURE = TEMPERATURE_BANDS[1].value;
export const DEFAULT_ENDING_STYLE: EndingStyleId = "auto";

export function clampTemperature(value: number): number {
  return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, Math.round(value)));
}

export function temperatureBandFor(value: number): TemperatureBand {
  const temperature = clampTemperature(value);
  return TEMPERATURE_BANDS.find((band) => temperature >= band.min && temperature <= band.max) ?? TEMPERATURE_BANDS[1];
}

export function endingStyleFor(id: EndingStyleId): EndingStyleContract {
  return ENDING_STYLES.find((style) => style.id === id) ?? ENDING_STYLES[0];
}

export function resolvedEndingStyleFor(id: ResolvedEndingStyleId): EndingStyleContract {
  return ENDING_STYLES.find((style) => style.id === id) ?? ENDING_STYLES[1];
}

export function outputModeFor(id: OutputModeId): OutputModeContract {
  return OUTPUT_MODES.find((mode) => mode.id === id) ?? OUTPUT_MODES[0];
}

export function inferTemperatureFromTone(tone: ToneParameters): number {
  if (tone.directness >= 90) return 95;
  if (tone.directness >= 75) return 75;
  if (tone.defensiveness >= 75 || tone.directness >= 58) return 55;
  if (tone.directness <= 30) return 15;
  return 35;
}

export const GENERATION_FIXTURES = [
  { id: "responsibility", text: "네가 만든 장애인데 왜 내가 보고서까지 써야 해?" },
  { id: "deadline", text: "오늘 주고 내일까지 하라는 게 말이 되냐?" },
  { id: "changes", text: "요구사항을 매번 바꾸면서 왜 일정이 늦냐고 해?" },
  { id: "meeting", text: "내 의견은 다 무시해놓고 이제 와서 왜 안 막았냐고?" },
  { id: "handoff", text: "담당자 따로 있는데 왜 계속 나한테 시키냐?" },
  {
    id: "rude-context",
    context: "이 정도도 못 맞추면 일을 왜 맡았어요? 오늘 안으로 끝내세요.",
    text: "요구사항을 계속 바꾼 건 그쪽인데 왜 일정 책임을 전부 나한테 넘겨?",
  },
] as const;
