import { expect, test } from "@playwright/test";

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

test("preset is primary and advanced sliders are progressive disclosure", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /오늘은 참지 않아요/ }).click();
  await expect(page.getByText(/불편함과 경계는 숨기지 않아요/)).toBeVisible();
  await page.getByRole("button", { name: /세부 톤 직접 조절하기/ }).click();
  await expect(page.getByTestId("tone-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: "답변 만들기" })).toBeDisabled();
});

test("rewrite result supports metadata and one-tap refinement", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  let refinement: string | undefined;
  await page.route("**/api/rewrite", async (route) => {
    const body = route.request().postDataJSON() as { rawReply?: string; refinement?: string };
    refinement = body.refinement;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rewritten: refinement === "shorter" ? "오늘은 어렵습니다." : "오늘은 완료가 어렵습니다. 기존 일정이 있습니다.",
        candidates: [refinement === "shorter" ? "오늘은 어렵습니다." : "오늘은 완료가 어렵습니다. 기존 일정이 있습니다."],
        preserved: ["오늘 완료 불가"],
        requestId: "test",
        model: "worker",
        latencyMs: 12,
        retryCount: 0,
        meta: { intent: "거절", audience: "동료/업무 상대" },
      }),
    });
  });

  await page.goto("/");
  await page.getByLabel("나는 뭐라고 답하고 싶나요?").fill("오늘은 못 합니다. 이미 일정이 있습니다.");
  await page.getByRole("button", { name: "답변 만들기" }).click();
  await expect(page.getByText("이렇게 보내는 걸 추천해요.")).toBeVisible();
  await expect(page.getByText("거절", { exact: true })).toBeVisible();
  await expect(page.getByText("동료/업무 상대", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "더 짧게" }).click();
  await expect.poll(() => refinement).toBe("shorter");
  await expect(page.getByText("오늘은 어렵습니다.", { exact: true })).toBeVisible();
});

test("context and raw reply are sent as separate fields", async ({ page }) => {
  let payload: { rawReply?: string; context?: string } | null = null;
  await page.route("**/api/rewrite", async (route) => {
    payload = route.request().postDataJSON() as { rawReply?: string; context?: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rewritten: "그 부분은 제가 작업한 건이 아닙니다. 담당 범위부터 확인해 주세요.",
        candidates: ["그 부분은 제가 작업한 건이 아닙니다. 담당 범위부터 확인해 주세요."],
        preserved: ["책임 부인"],
        requestId: "test",
        model: "worker",
        latencyMs: 12,
        retryCount: 0,
        meta: { intent: "책임 경계", audience: "동료/업무 상대" },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /상대가 한 말도 있어요/ }).click();
  await page.getByLabel("상대가 뭐라고 했나요?").fill("DB 컬럼 미스 건 내일까지 보고 작성하세요.");
  await page.getByLabel("나는 뭐라고 답하고 싶나요?").fill("그거 제가 만든 것도 아닌데 왜 제가 써요");
  await page.getByRole("button", { name: "답변 만들기" }).click();
  expect(payload).toMatchObject({
    context: "DB 컬럼 미스 건 내일까지 보고 작성하세요.",
    rawReply: "그거 제가 만든 것도 아닌데 왜 제가 써요",
  });
});
