import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { rewriteMessage } from "@/lib/ai/rewrite";
import {
  evaluateBusinessShift,
  evaluateDirectnessShift,
  evaluateIntentPreservation,
  evaluateParameterShift,
  evaluateReplySemantics,
  FIXTURES,
  PARAMETER_MATRIX,
  REPLY_FIXTURES,
  TONE_VARIANTS,
} from "@/lib/ai/quality";
import { hasChineseContamination } from "@/lib/ai/validator";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(file), "utf8").split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index < 0) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // local env files are optional
  }
}

loadEnv(".env.local");
loadEnv(".env");

const enabled = Boolean(process.env.GOVAIL_API_KEY);

describe.skipIf(!enabled)("live GoVail quality", () => {
  it(
    "preserves refusal and boundary fixtures",
    async () => {
      const cases = [FIXTURES.hardNo, FIXTURES.notDev, FIXTURES.refusal, FIXTURES.boundary, FIXTURES.golden];
      for (const fixture of cases) {
        const result = await rewriteMessage({
          context: "",
          rawReply: fixture.text,
          directness: 80,
          defensiveness: 85,
          business: 70,
        });
        expect(hasChineseContamination(result.rewritten)).toBe(false);
        const verdict = evaluateIntentPreservation(fixture.text, result.rewritten);
        expect(verdict.failures, `${fixture.id}: ${result.rewritten}\n${verdict.failures.join(", ")}`).toEqual([]);
      }
    },
    180_000,
  );

  it(
    "blocks role reversal on the DB column fixture across tones",
    async () => {
      const fixture = REPLY_FIXTURES.dbColumn;
      const tones = [TONE_VARIANTS.mid, TONE_VARIANTS.strong, TONE_VARIANTS.soft, TONE_VARIANTS.gate];
      for (const tone of tones) {
        const result = await rewriteMessage({
          context: fixture.context,
          rawReply: fixture.rawReply,
          ...tone,
        });
        expect(hasChineseContamination(result.rewritten)).toBe(false);
        expect(result.rewritten).not.toMatch(/씨발|개새끼/);
        const verdict = evaluateReplySemantics(fixture.context, fixture.rawReply, result.rewritten);
        expect(
          verdict.failures,
          `${fixture.id} ${tone.directness}/${tone.defensiveness}/${tone.business}: ${result.rewritten}\n${verdict.failures.join(", ")}`,
        ).toEqual([]);
      }
    },
    180_000,
  );

  it(
    "keeps speech acts on responsibility, deadline, and customer fixtures",
    async () => {
      const cases = [
        REPLY_FIXTURES.incident,
        REPLY_FIXTURES.deadline,
        REPLY_FIXTURES.assumption,
        REPLY_FIXTURES.customerPushback,
      ];
      for (const fixture of cases) {
        const result = await rewriteMessage({
          context: fixture.context,
          rawReply: fixture.rawReply,
          ...TONE_VARIANTS.gate,
        });
        expect(hasChineseContamination(result.rewritten)).toBe(false);
        const verdict = evaluateReplySemantics(fixture.context, fixture.rawReply, result.rewritten);
        expect(
          verdict.failures,
          `${fixture.id}: ${result.rewritten}\n${verdict.failures.join(", ")}`,
        ).toEqual([]);
      }
    },
    180_000,
  );

  it(
    "makes low business stay closer to the raw reply than high business",
    async () => {
      const fixture = REPLY_FIXTURES.dbColumn;
      const low = await rewriteMessage({
        context: fixture.context,
        rawReply: fixture.rawReply,
        ...TONE_VARIANTS.lowBusiness,
      });
      const high = await rewriteMessage({
        context: fixture.context,
        rawReply: fixture.rawReply,
        ...TONE_VARIANTS.highBusiness,
      });
      expect(hasChineseContamination(low.rewritten)).toBe(false);
      expect(hasChineseContamination(high.rewritten)).toBe(false);
      const verdict = evaluateBusinessShift(low.rewritten, high.rewritten);
      expect(
        verdict.pass,
        `low(20): ${low.rewritten}\nhigh(85): ${high.rewritten}\n${verdict.failures.join(", ")}`,
      ).toBe(true);
    },
    90_000,
  );

  it(
    "changes directness without dropping the refusal",
    async () => {
      const fixture = REPLY_FIXTURES.deadline;
      const soft = await rewriteMessage({
        context: fixture.context,
        rawReply: fixture.rawReply,
        directness: 20,
        defensiveness: 70,
        business: 50,
      });
      const hard = await rewriteMessage({
        context: fixture.context,
        rawReply: fixture.rawReply,
        directness: 90,
        defensiveness: 70,
        business: 50,
      });
      expect(evaluateReplySemantics(fixture.context, fixture.rawReply, soft.rewritten).pass).toBe(true);
      expect(evaluateReplySemantics(fixture.context, fixture.rawReply, hard.rewritten).pass).toBe(true);
      const verdict = evaluateDirectnessShift(soft.rewritten, hard.rewritten);
      expect(verdict.pass, `soft: ${soft.rewritten}\nhard: ${hard.rewritten}\n${verdict.failures.join(", ")}`).toBe(
        true,
      );
    },
    90_000,
  );

  it(
    "changes output across the parameter matrix",
    async () => {
      const samples = [];
      for (const [directness, defensiveness, business] of PARAMETER_MATRIX) {
        const result = await rewriteMessage({
          context: "",
          rawReply: FIXTURES.golden.text,
          directness,
          defensiveness,
          business,
        });
        samples.push({
          label: `${directness}/${defensiveness}/${business}`,
          text: result.rewritten,
        });
        expect(hasChineseContamination(result.rewritten)).toBe(false);
      }
      const verdict = evaluateParameterShift(samples);
      expect(verdict.pass, samples.map((s) => `${s.label}: ${s.text}`).join("\n\n")).toBe(true);
    },
    240_000,
  );
});
