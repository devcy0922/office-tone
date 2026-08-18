import { describe, expect, it } from "vitest";

import { evaluateIntentPreservation, evaluateParameterShift } from "@/lib/ai/quality";
import { extractJsonObject, hasChineseContamination, validateOutput } from "@/lib/ai/validator";
import { PRESETS } from "@/lib/presets";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

describe("validator", () => {
  it("parses fenced JSON", () => {
    const parsed = extractJsonObject('```json\n{"rewritten":"오늘은 어렵습니다.","preserved":["거절"]}\n```');
    expect(parsed).toEqual({ rewritten: "오늘은 어렵습니다.", preserved: ["거절"] });
  });

  it("flags empty output", () => {
    const result = validateOutput("   ");
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("empty");
    expect(result.shouldRegenerate).toBe(true);
  });

  it("flags Chinese contamination", () => {
    expect(hasChineseContamination("请确认这个问题")).toBe(true);
    expect(hasChineseContamination("오늘은 어렵습니다.")).toBe(false);
    const result = validateOutput('{"rewritten":"请确认请求","preserved":[]}');
    expect(result.issues).toContain("chinese");
    expect(result.shouldRegenerate).toBe(true);
  });

  it("parses JSON even when rewritten contains raw newlines", () => {
    const raw = `{
  "rewritten": "오늘은 어렵습니다.
요구사항이 변경되었습니다.",
  "preserved": ["거절"]
}`;
    const result = validateOutput(raw);
    expect(result.ok).toBe(true);
    expect(result.rewritten).toContain("요구사항");
  });

  it("strips duplicated JSON keys from messy model output", () => {
    const raw = '{"rewritten": "rewined": "오늘은 완료가 어렵습니다. 요구사항이 변경되었습니다.", "preserved": []}';
    const result = validateOutput(raw);
    expect(result.rewritten.startsWith("오늘")).toBe(true);
    expect(result.rewritten).toContain("어렵");
  });
});

describe("intent preservation", () => {
  it("fails when 못 합니다 becomes 최대한 해보겠습니다", () => {
    const verdict = evaluateIntentPreservation("못 합니다.", "최대한 해보겠습니다.");
    expect(verdict.pass).toBe(false);
  });

  it("fails when a boundary becomes a joint review", () => {
    const verdict = evaluateIntentPreservation("개발 문제가 아닙니다.", "저희도 함께 확인해보겠습니다.");
    expect(verdict.pass).toBe(false);
  });

  it("passes a preserved refusal", () => {
    const verdict = evaluateIntentPreservation(
      "오늘은 못 합니다. 이미 일정 꽉 찼는데 갑자기 주시면 어떻게 해요.",
      "오늘은 완료가 어렵습니다. 일정이 이미 차 있어 오늘 요청은 진행할 수 없습니다.",
    );
    expect(verdict.pass).toBe(true);
  });

  it("flags invented apology", () => {
    const verdict = evaluateIntentPreservation("일정 조정이 필요합니다.", "죄송합니다. 일정 조정이 필요합니다.");
    expect(verdict.pass).toBe(false);
  });
});

describe("parameter matrix uniqueness", () => {
  it("treats near-identical outputs as failure", () => {
    const verdict = evaluateParameterShift([
      { label: "a", text: "확인 부탁드립니다." },
      { label: "b", text: "확인 부탁드립니다." },
      { label: "c", text: "확인 부탁드립니다." },
      { label: "d", text: "확인 부탁드립니다." },
    ]);
    expect(verdict.pass).toBe(false);
  });
});

describe("presets", () => {
  it("maps 오늘은 참지 않아요 to 100/80/40", () => {
    const preset = PRESETS.find((item) => item.id === "today");
    expect(preset).toMatchObject({ directness: 100, defensiveness: 80, business: 40 });
  });
});

describe("system prompt", () => {
  it("forbids invented concessions", () => {
    expect(SYSTEM_PROMPT).toContain("NEVER INVENT");
    expect(SYSTEM_PROMPT).toContain("최대한 노력해보겠습니다");
    expect(SYSTEM_PROMPT).toContain("중국어");
  });
});
