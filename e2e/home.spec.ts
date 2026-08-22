import { expect, test } from "@playwright/test";

function rewritePayload(sendable: string) {
  return {
    rewritten: sendable,
    candidates: [
      sendable,
      "오늘 갑자기 던진 일정까지 제 책임으로 만들 수는 없어요.",
      "오늘 주고 오늘 끝내라는 건 일정이 아니라 순간이동을 하라는 거죠.",
    ],
    results: {
      sendable,
      pointed: "오늘 갑자기 던진 일정까지 제 책임으로 만들 수는 없어요.",
      inner: "오늘 주고 오늘 끝내라는 건 일정이 아니라 순간이동을 하라는 거죠.",
    },
    preserved: ["오늘 완료 불가"],
    requestId: "test",
    model: "worker",
    latencyMs: 12,
    retryCount: 0,
    endingStyle: "yo",
    temperatureBand: "무난하게",
    meta: { intent: "거절", audience: "동료/업무 상대" },
  };
}

test("first screen prioritizes input and preset choice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /할 말은 해야 하는데/ })).toBeVisible();
  await expect(page.getByLabel("나는 뭐라고 답하고 싶나요?")).toBeVisible();
  await expect(page.getByRole("button", { name: /상대가 한 말도 있어요/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "답변 만들기" })).toBeVisible();
  await expect(page.getByText("무난하게", { exact: true })).toBeVisible();
  await expect(page.getByTestId("tone-summary")).toHaveCount(0);
});

test("context is optional and stays semantically separate", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /상대가 한 말도 있어요/ }).click();
  await expect(page.getByLabel("상대가 뭐라고 했나요?")).toBeVisible();
  await expect(page.getByText(/답변의 근거로만 써요/)).toBeVisible();
});

test("preset is primary and advanced controls expose ending styles", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /오늘은 참지 않아요/ }).click();
  await expect(page.getByText(/분노와 억울함을 숨기지 않고/)).toBeVisible();
  await page.getByRole("button", { name: /세부 톤·말끝 직접 조절하기/ }).click();
  await expect(page.getByTestId("tone-summary")).toBeVisible();
  await expect(page.getByText("말끝", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /합니다·습니다/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "답변 만들기" })).toBeDisabled();
});

test("rewrite result exposes three purpose-specific modes and refinement", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  let refinement: string | undefined;
  await page.route("**/api/rewrite", async (route) => {
    const body = route.request().postDataJSON() as { rawReply?: string; refinement?: string };
    refinement = body.refinement;
    const sendable = refinement === "shorter" ? "오늘은 어려워요." : "오늘은 완료하기 어려워요. 기존 일정이 있어요.";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(rewritePayload(sendable)),
    });
  });

  await page.goto("/");
  await page.getByLabel("나는 뭐라고 답하고 싶나요?").fill("오늘은 못 합니다. 이미 일정이 있습니다.");
  await page.getByRole("button", { name: "답변 만들기" }).click();
  await expect(page.getByText("같은 말, 세 가지 방식으로 만들었어요.")).toBeVisible();
  await expect(page.getByText("실제로 보내기", { exact: true })).toBeVisible();
  await expect(page.getByText("뼈 있게 보내기", { exact: true })).toBeVisible();
  await expect(page.getByText("내 속마음", { exact: true })).toBeVisible();
  await expect(page.getByText("공유/카타르시스용", { exact: true })).toBeVisible();
  await expect(page.getByText("거절", { exact: true })).toBeVisible();
  await expect(page.getByText("동료/업무 상대", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "더 짧게" }).click();
  await expect.poll(() => refinement).toBe("shorter");
  await expect(page.getByText("오늘은 어려워요.", { exact: true })).toBeVisible();
});

test("context, temperature and ending style are sent as independent fields", async ({ page }) => {
  let payload: { rawReply?: string; context?: string; temperature?: number; endingStyle?: string } | null = null;
  await page.route("**/api/rewrite", async (route) => {
    payload = route.request().postDataJSON() as typeof payload;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...rewritePayload("그 부분은 제가 작업한 건이 아니에요. 보고 책임까지 제게 넘기지는 마세요."),
        preserved: ["책임 부인"],
        meta: { intent: "책임 경계", audience: "동료/업무 상대" },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /오늘은 참지 않아요/ }).click();
  await page.getByRole("button", { name: /세부 톤·말끝 직접 조절하기/ }).click();
  await page.getByRole("button", { name: /메신저와 동료 대화/ }).click();
  await page.getByRole("button", { name: /상대가 한 말도 있어요/ }).click();
  await page.getByLabel("상대가 뭐라고 했나요?").fill("DB 컬럼 미스 건 내일까지 보고 작성하세요.");
  await page.getByLabel("나는 뭐라고 답하고 싶나요?").fill("그거 제가 만든 것도 아닌데 왜 제가 써요");
  await page.getByRole("button", { name: "답변 만들기" }).click();
  expect(payload).toMatchObject({
    context: "DB 컬럼 미스 건 내일까지 보고 작성하세요.",
    rawReply: "그거 제가 만든 것도 아닌데 왜 제가 써요",
    temperature: 95,
    endingStyle: "yo",
  });
});
