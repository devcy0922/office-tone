import { expect, test, type APIRequestContext } from "@playwright/test";

import { evaluateBusinessShift, evaluateReplySemantics, REPLY_FIXTURES, TONE_VARIANTS } from "../src/lib/ai/quality";
import { hasChineseContamination } from "../src/lib/ai/validator";

const live = Boolean(process.env.E2E_LIVE);

test.skip(!live, "set E2E_LIVE=1 to hit a real rewrite endpoint");
test.describe.configure({ timeout: 90_000 });

type RewriteBody = {
  rewritten: string;
  candidates?: string[];
  preserved?: string[];
};

async function rewrite(
  request: APIRequestContext,
  data: { context: string; rawReply: string; directness: number; defensiveness: number; business: number },
) {
  const response = await request.post("/api/rewrite", { data });
  expect(response.ok(), `rewrite HTTP ${response.status()}`).toBeTruthy();
  return (await response.json()) as RewriteBody;
}

test("golden path rewrite on the deployed app", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("뭐라고 답하고 싶나요?").fill(
    "아니 이거 요구사항이 계속 바뀐 건데 왜 제가 오늘 야근해서 맞춰야 하죠? 오늘은 어렵습니다.",
  );
  await page.getByRole("button", { name: /상대가 한 말이나 상황도 알려줄게요/ }).click();
  await page.getByLabel("상대가 뭐라고 했나요?").fill("요구사항이 계속 바뀌었습니다.");
  await page.getByRole("button", { name: "확실하게 말해요" }).click();
  await page.getByRole("button", { name: "보내기 좋게 바꿔주세요" }).click();
  await expect(page.getByText("이렇게 말해보세요.")).toBeVisible({ timeout: 45_000 });
  const body = await page.locator("main, body").innerText();
  expect(body).toMatch(/어렵|불가|할 수 없|진행할 수 없/);
  expect(body).toMatch(/요구사항|변경/);
  expect(body).not.toMatch(/최대한 해보|请|确认|问题/);
});

test("role reversal UI: DB column blame stays a user reply", async ({ page }) => {
  const fixture = REPLY_FIXTURES.dbColumn;
  await page.goto("/");
  await page.getByLabel("뭐라고 답하고 싶나요?").fill(fixture.rawReply);
  await page.getByRole("button", { name: /상대가 한 말이나 상황도 알려줄게요/ }).click();
  await page.getByLabel("상대가 뭐라고 했나요?").fill(fixture.context);
  await page.getByRole("button", { name: "확실하게 말해요" }).click();
  await page.getByRole("button", { name: "보내기 좋게 바꿔주세요" }).click();
  await expect(page.getByText("이렇게 말해보세요.")).toBeVisible({ timeout: 45_000 });
  const body = await page.locator("main, body").innerText();
  expect(body).toMatch(/아니|아닙|제가 (한|진행|만든|변경)|제 (작업|업무)|책임/);
  expect(body).not.toMatch(/씨발|개새끼/);
  expect(body).not.toMatch(/보고 작성 부탁/);
  expect(body).not.toMatch(/작성하겠습니다|보고드리겠습니다/);
  expect(body).not.toMatch(/请|确认|问题/);
});

test("API role reversal gate uses exact tone 80/90/70", async ({ request }) => {
  const fixture = REPLY_FIXTURES.dbColumn;
  const result = await rewrite(request, {
    context: fixture.context,
    rawReply: fixture.rawReply,
    ...TONE_VARIANTS.gate,
  });
  expect(hasChineseContamination(result.rewritten)).toBe(false);
  expect(result.rewritten).not.toMatch(/씨발|개새끼/);
  expect(result.rewritten).not.toMatch(/보고 작성 부탁/);
  const verdict = evaluateReplySemantics(fixture.context, fixture.rawReply, result.rewritten);
  expect(verdict.failures, `${result.rewritten}\n${verdict.failures.join(", ")}`).toEqual([]);
});

test("API low business stays closer to the raw reply than high business", async ({ request }) => {
  const fixture = REPLY_FIXTURES.deadline;
  const low = await rewrite(request, {
    context: fixture.context,
    rawReply: fixture.rawReply,
    ...TONE_VARIANTS.lowBusiness,
  });
  const high = await rewrite(request, {
    context: fixture.context,
    rawReply: fixture.rawReply,
    ...TONE_VARIANTS.highBusiness,
  });
  expect(hasChineseContamination(low.rewritten)).toBe(false);
  expect(hasChineseContamination(high.rewritten)).toBe(false);
  expect(evaluateReplySemantics(fixture.context, fixture.rawReply, low.rewritten).pass).toBe(true);
  expect(evaluateReplySemantics(fixture.context, fixture.rawReply, high.rewritten).pass).toBe(true);
  const verdict = evaluateBusinessShift(low.rewritten, high.rewritten);
  expect(verdict.pass, `low: ${low.rewritten}\nhigh: ${high.rewritten}\n${verdict.failures.join(", ")}`).toBe(true);
});
