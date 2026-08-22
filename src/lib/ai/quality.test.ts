import { describe, expect, it } from "vitest";

import { evaluateBusinessShift, evaluateIntentPreservation, evaluateParameterShift, evaluateReplySemantics } from "@/lib/ai/quality";
import { inferCommunicationMeta } from "@/lib/ai/meta";
import { looksLikeRoleReversal } from "@/lib/ai/semantics";
import { buildDeveloperPrompt, extractJsonObject as _unused, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { extractJsonObject, hasChineseContamination, stripLabelLeak, validateOutput } from "@/lib/ai/validator";
import { PRESETS } from "@/lib/presets";
import { TONE_MAX, TONE_MIN } from "@/lib/ai/types";
import { summarizeTone } from "@/lib/tone-summary";

void _unused;

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
  });

  it("parses v candidates and kept keys", () => {
    const raw = '{"v":["오늘은 완료가 어렵습니다.","오늘 일정으로는 진행이 어렵습니다."],"kept":["오늘 불가"]}';
    const result = validateOutput(raw);
    expect(result.ok).toBe(true);
    expect(result.candidates).toHaveLength(2);
    expect(result.preserved).toEqual(["오늘 불가"]);
  });

  it("keeps sendable text and strips leaked labels", () => {
    const cleaned = stripLabelLeak("같은 문제가 반복되면 업무를 이어가기 어렵습니다.\n재발 시 퇴사 조치\n동일한 실수 금지");
    expect(cleaned).toContain("이어가기 어렵");
    expect(cleaned).not.toContain("동일한 실수 금지");
  });
});

describe("intent preservation", () => {
  it("fails when refusal becomes acceptance", () => {
    expect(evaluateIntentPreservation("못 합니다.", "최대한 해보겠습니다.").pass).toBe(false);
  });

  it("fails invented apology", () => {
    expect(evaluateIntentPreservation("일정 조정이 필요합니다.", "죄송합니다. 일정 조정이 필요합니다.").pass).toBe(false);
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
  it("makes the strongest preset visibly extreme", () => {
    const preset = PRESETS.find((item) => item.id === "today");
    expect(preset).toMatchObject({ directness: 99, defensiveness: 90, business: 26 });
  });

  it("keeps every tone inside 1–99", () => {
    for (const preset of PRESETS) {
      for (const value of [preset.directness, preset.defensiveness, preset.business]) {
        expect(value).toBeGreaterThanOrEqual(TONE_MIN);
        expect(value).toBeLessThanOrEqual(TONE_MAX);
      }
    }
  });
});

describe("system prompt", () => {
  it("preserves hard semantic boundaries but allows style freedom", () => {
    expect(SYSTEM_PROMPT).toContain("절대 바꾸면 안 되는 것");
    expect(SYSTEM_PROMPT).toContain("절대 만들면 안 되는 것");
    expect(SYSTEM_PROMPT).toContain("표현 자체는 자유롭게");
    expect(SYSTEM_PROMPT).toContain("중국어");
    expect(SYSTEM_PROMPT).toContain('"v"');
    expect(SYSTEM_PROMPT).toContain("<raw_reply>");
  });

  it("adds explicit refinement instructions", () => {
    const prompt = buildDeveloperPrompt({
      context: "",
      rawReply: "오늘은 못 합니다",
      directness: 50,
      defensiveness: 50,
      business: 58,
      refinement: "shorter",
    });
    expect(prompt).toContain("1~2문장");
  });
});

describe("automatic metadata", () => {
  it("infers responsibility boundaries without a user chip", () => {
    const meta = inferCommunicationMeta({
      context: "DB 컬럼 미스 건 내일까지 보고 작성하세요.",
      rawReply: "그거 제가 만든 것도 아닌데 왜 제가 써요",
      directness: 50,
      defensiveness: 50,
      business: 58,
    });
    expect(meta.intent).toBe("책임 경계");
  });

  it("infers explicit leader audience from context", () => {
    const meta = inferCommunicationMeta({
      context: "팀장님이 오늘까지 달라고 했습니다.",
      rawReply: "오늘은 어렵습니다.",
      directness: 50,
      defensiveness: 50,
      business: 58,
    });
    expect(meta.audience).toBe("상사/리더");
  });
});

describe("role reversal", () => {
  const context = "DB 컬럼 미스 내일까지 보고 작성하세요.";
  const rawReply = "개새끼야 니가 만든 거야 씨발새끼야";

  it("flags rewriting the counterpart request as the user request", () => {
    const reversed = "내일까지 DB 컬럼 미스 건에 대해 보고 작성 부탁드립니다.";
    expect(looksLikeRoleReversal(context, rawReply, reversed)).toBe(true);
    expect(evaluateReplySemantics(context, rawReply, reversed).pass).toBe(false);
  });

  it("passes a user reply that keeps blame denial", () => {
    const ok = "해당 DB 컬럼 변경은 제가 진행한 작업이 아닌 것으로 알고 있습니다. 제가 보고서를 작성해야 하는 건지 먼저 책임 범위를 확인했으면 합니다.";
    expect(looksLikeRoleReversal(context, rawReply, ok)).toBe(false);
    expect(evaluateReplySemantics(context, rawReply, ok).pass).toBe(true);
  });
});

describe("business shift", () => {
  it("requires high business to be more formal", () => {
    expect(evaluateBusinessShift(
      "그거 제가 만든 거 아니에요. 왜 제가 보고를 써야 하죠?",
      "해당 컬럼 변경은 제가 진행한 작업이 아닙니다. 보고 책임 범위부터 확인해 주시기 바랍니다.",
    ).pass).toBe(true);
  });
});

describe("tone summary", () => {
  it("explains low business as staying close to the raw reply", () => {
    expect(summarizeTone({ directness: 70, defensiveness: 80, business: 20 })).toContain("편한 말");
  });
});
