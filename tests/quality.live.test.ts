import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { rewriteMessage } from "@/lib/ai/rewrite";
import { evaluateIntentPreservation, evaluateParameterShift, FIXTURES, PARAMETER_MATRIX } from "@/lib/ai/quality";
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
          text: fixture.text,
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
    "changes output across the parameter matrix",
    async () => {
      const samples = [];
      for (const [directness, defensiveness, business] of PARAMETER_MATRIX) {
        const result = await rewriteMessage({
          text: FIXTURES.golden.text,
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
