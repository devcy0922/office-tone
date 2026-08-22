import { describe, expect, it } from "vitest";

import {
  ENDING_STYLES,
  GENERATION_FIXTURES,
  OUTPUT_MODES,
  TEMPERATURE_BANDS,
  temperatureBandFor,
} from "@/lib/ai/generation-contracts";
import { endingStyleMatches, normalizeGenerationOutput } from "@/lib/ai/generation-output";
import { buildDeveloperPrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";

describe("generation contract SSOT", () => {
  it("defines the five product temperature bands without gaps", () => {
    expect(TEMPERATURE_BANDS.map(({ min, max }) => [min, max])).toEqual([
      [0, 20],
      [21, 40],
      [41, 60],
      [61, 80],
      [81, 100],
    ]);
    expect(temperatureBandFor(100).id).toBe("today");
  });

  it("keeps the hottest band visibly stronger than the safe default", () => {
    const low = temperatureBandFor(15);
    const high = temperatureBandFor(95);
    expect(high.allowedDevices).toEqual(expect.arrayContaining(["냉소", "풍자", "비유"]));
    expect(high.forbiddenSofteners).toContain("적절하지 않습니다");
    expect(low.allowedDevices).not.toContain("냉소");
  });

  it("defines three real ending styles plus auto", () => {
    expect(ENDING_STYLES.map((style) => style.id)).toEqual(["auto", "yo", "formal", "plain"]);
    expect(ENDING_STYLES.find((style) => style.id === "yo")?.generationContract.join(" ")).toContain("대화형");
    expect(ENDING_STYLES.find((style) => style.id === "formal")?.generationContract.join(" ")).toContain("기록");
    expect(ENDING_STYLES.find((style) => style.id === "plain")?.generationContract.join(" ")).toContain("선언문");
  });

  it("defines the three output strategies instead of synonym candidates", () => {
    expect(OUTPUT_MODES.map((mode) => mode.id)).toEqual(["sendable", "pointed", "inner"]);
    expect(OUTPUT_MODES.find((mode) => mode.id === "pointed")?.generationContract.join(" ")).toContain("동의어 치환");
    expect(OUTPUT_MODES.find((mode) => mode.id === "inner")?.generationContract.join(" ")).toContain("욕설");
  });

  it("covers every requested regression fixture", () => {
    expect(GENERATION_FIXTURES).toHaveLength(6);
    expect(GENERATION_FIXTURES.map((fixture) => fixture.id)).toEqual([
      "responsibility",
      "deadline",
      "changes",
      "meeting",
      "handoff",
      "rude-context",
    ]);
  });

  it("builds a 5 x 3 x 3 explicit contract matrix", () => {
    const concreteStyles = ENDING_STYLES.filter((style) => style.id !== "auto");
    const matrix = TEMPERATURE_BANDS.flatMap((band) =>
      concreteStyles.flatMap((style) => OUTPUT_MODES.map((mode) => `${band.id}:${style.id}:${mode.id}`)),
    );
    expect(matrix).toHaveLength(45);
    expect(new Set(matrix).size).toBe(45);
  });
});

describe("prompt contract", () => {
  const base = {
    context: "DB 컬럼 미스 내일까지 보고 작성하세요.",
    rawReply: "네가 만든 장애인데 왜 내가 보고서까지 써야 해?",
    directness: 50,
    defensiveness: 50,
    business: 58,
  };

  it("makes low and high temperature prompts materially different", () => {
    const low = buildDeveloperPrompt({ ...base, temperature: 15, endingStyle: "yo" });
    const high = buildDeveloperPrompt({ ...base, temperature: 95, endingStyle: "yo" });
    expect(low).not.toBe(high);
    expect(high).toContain("냉소");
    expect(high).toContain("적절하지 않습니다");
    expect(low).not.toContain("압박감 있는 질문");
  });

  it("changes more than the sentence ending across style contracts", () => {
    const yo = buildDeveloperPrompt({ ...base, temperature: 75, endingStyle: "yo" });
    const formal = buildDeveloperPrompt({ ...base, temperature: 75, endingStyle: "formal" });
    const plain = buildDeveloperPrompt({ ...base, temperature: 75, endingStyle: "plain" });
    expect(yo).toContain("대화형");
    expect(formal).toContain("기록으로 남는 느낌");
    expect(plain).toContain("선언문");
  });

  it("makes firmer refinement require structural change", () => {
    const prompt = buildDeveloperPrompt({ ...base, temperature: 75, endingStyle: "yo", refinement: "firmer" });
    expect(prompt).toContain("문장 구조와 리듬까지 바꾼다");
  });

  it("explicitly requests all three modes and preserves user profanity only where appropriate", () => {
    expect(SYSTEM_PROMPT).toContain('"sendable"');
    expect(SYSTEM_PROMPT).toContain('"pointed"');
    expect(SYSTEM_PROMPT).toContain('"inner"');
    expect(SYSTEM_PROMPT).toContain("욕설이 있다는 이유로 작업을 거부");
    expect(SYSTEM_PROMPT).toContain("원문에 없는 사실, 협박, 차별");
  });
});

describe("generation output envelope", () => {
  it("normalizes mode keys into validator candidate order", () => {
    const raw = JSON.stringify({
      style: "yo",
      modes: {
        sendable: "이건 제 책임이 아니에요. 보고 책임까지 넘기지는 마세요.",
        pointed: "불은 제가 껐지만 화재 보고서까지 대신 쓰지는 않을게요.",
        inner: "장애는 네가 만들고 보고서는 내가 쓰라고? 책임 떠넘기지 마.",
      },
      kept: ["책임 거부"],
    });
    const envelope = normalizeGenerationOutput(raw);
    expect(envelope.completeModes).toBe(true);
    expect(envelope.resolvedEndingStyle).toBe("yo");
    expect(envelope.validationRaw).toContain('"v"');
  });

  it("rejects missing modes or a different explicit ending style", () => {
    expect(normalizeGenerationOutput('{"style":"yo","modes":{"sendable":"하나"}}').completeModes).toBe(false);
    expect(endingStyleMatches("formal", "yo")).toBe(false);
    expect(endingStyleMatches("auto", "plain")).toBe(true);
  });
});
