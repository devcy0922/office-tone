import type { ToneParameters } from "@/lib/ai/types";

export function summarizeTone({ directness, defensiveness, business }: ToneParameters): string {
  if (directness <= 35 && defensiveness <= 40) {
    return "최대한 부드럽게 말하면서 해결 가능성을 열어둬요.";
  }
  if (directness >= 70 && defensiveness >= 70 && business >= 60) {
    return "공식적으로 말하면서 선은 확실히 그어요.";
  }
  if (business <= 35 && directness >= 60) {
    return "편한 말로, 하고 싶은 말은 분명히 전해요.";
  }
  if (business <= 35) {
    return "속마음에 가깝게, 메신저에 바로 넣을 말투로 다듬어요.";
  }
  if (directness >= 70 && defensiveness >= 70) {
    return "돌려 말하지 않고 내 입장을 분명하게 전해요.";
  }
  if (directness <= 45 && defensiveness >= 65) {
    return "예의는 지키되, 책임 범위는 확실하게 말해요.";
  }
  if (business >= 75 && defensiveness >= 65) {
    return "공식적으로 말하면서 선은 확실히 그어요.";
  }
  if (directness >= 75) {
    return "돌려 말하지 않고 내 입장을 분명하게 전해요.";
  }
  if (defensiveness >= 75) {
    return "예의는 지키되, 책임 범위는 확실하게 말해요.";
  }
  if (business >= 75) {
    return "정돈된 업무 말투로 입장을 전해요.";
  }
  return "무난한 온도로, 직장에서 바로 보낼 수 있게 다듬어요.";
}
