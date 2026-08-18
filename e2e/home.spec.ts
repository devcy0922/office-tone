import { expect, test } from "@playwright/test";

test("first screen is a single vertical composer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /할 말은 그대로/ })).toBeVisible();
  await expect(page.getByText("보내기 어려운 회사 메시지가 있나요?")).toBeVisible();
  await expect(page.getByLabel("뭐라고 답하고 싶나요?")).toBeVisible();
  await expect(page.getByText("속마음 그대로 적어도 괜찮아요.")).toBeVisible();
  await expect(page.getByLabel("상대가 뭐라고 했나요?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /상대가 한 말이나 상황도 알려줄게요/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "보내기 좋게 바꿔주세요" })).toBeVisible();
  await expect(page.getByTestId("tone-summary")).toBeVisible();
  await expect(page.getByText("무난하게 말해요")).toBeVisible();
  await expect(page.getByText("Get Started")).toHaveCount(0);
  await expect(page.getByText("무슨 일이었나요?")).toHaveCount(0);
});

test("context is an optional expansion in the same card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /상대가 한 말이나 상황도 알려줄게요/ }).click();
  await expect(page.getByLabel("상대가 뭐라고 했나요?")).toBeVisible();
  await expect(page.getByText("받은 메시지나 상황을 알려주면 더 정확하게 다듬을 수 있어요.")).toBeVisible();
  const rawBox = await page.getByLabel("뭐라고 답하고 싶나요?").boundingBox();
  const contextBox = await page.getByLabel("상대가 뭐라고 했나요?").boundingBox();
  expect(rawBox && contextBox).toBeTruthy();
  expect(contextBox!.y).toBeGreaterThan(rawBox!.y);
});

test("preset is selectable and empty submit stays disabled", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "오늘은 참지 않아요" }).click();
  await expect(page.getByRole("button", { name: "오늘은 참지 않아요" })).toBeVisible();
  await expect(page.getByTestId("tone-summary")).toContainText("내 입장을 분명하게");
  await expect(page.getByRole("button", { name: "보내기 좋게 바꿔주세요" })).toBeDisabled();
});

test("rewrite result can be copied from a vertical flow", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/rewrite", async (route) => {
    const body = route.request().postDataJSON() as { rawReply?: string; context?: string };
    expect(body.rawReply).toContain("오늘은 못 합니다");
    expect(body.context).toBe("");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rewritten: "오늘은 완료가 어렵습니다. 요구사항 변경 이후 일정 재조정이 필요합니다.",
        candidates: [
          "오늘은 완료가 어렵습니다. 요구사항 변경 이후 일정 재조정이 필요합니다.",
          "요구사항이 바뀐 상태라 오늘은 진행이 어렵습니다.",
        ],
        preserved: ["오늘 완료 불가", "요구사항 변경"],
        requestId: "test",
        model: "worker",
        latencyMs: 12,
        retryCount: 0,
      }),
    });
  });
  await page.goto("/");
  await page.getByLabel("뭐라고 답하고 싶나요?").fill("오늘은 못 합니다. 요구사항이 바뀌었습니다.");
  await expect(page.getByRole("button", { name: "보내기 좋게 바꿔주세요" })).toBeEnabled();
  await page.getByRole("button", { name: "보내기 좋게 바꿔주세요" }).click();
  await expect(page.getByText("이렇게 말해보세요.")).toBeVisible();
  await expect(page.getByText("오늘은 완료가 어렵습니다.")).toBeVisible();
  await expect(page.getByText("요구사항이 바뀐 상태라 오늘은 진행이 어렵습니다.")).toBeVisible();
  await page.getByRole("button", { name: "복사하기" }).first().click();
  await expect(page.getByRole("button", { name: "복사했어요" })).toBeVisible();
});

test("context and rawReply are sent as separate fields", async ({ page }) => {
  let payload: { rawReply?: string; context?: string } | null = null;
  await page.route("**/api/rewrite", async (route) => {
    payload = route.request().postDataJSON() as { rawReply?: string; context?: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rewritten: "해당 컬럼 변경은 제가 진행한 작업이 아닙니다. 보고 책임부터 확인해 주세요.",
        candidates: ["해당 컬럼 변경은 제가 진행한 작업이 아닙니다. 보고 책임부터 확인해 주세요."],
        preserved: ["책임 부인"],
        requestId: "test",
        model: "worker",
        latencyMs: 12,
        retryCount: 0,
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /상대가 한 말이나 상황도 알려줄게요/ }).click();
  await page.getByLabel("상대가 뭐라고 했나요?").fill("DB 컬럼 미스 내일까지 보고 작성하세요.");
  await page.getByLabel("뭐라고 답하고 싶나요?").fill("개새끼야 니가 만든 거야 씨발새끼야");
  await page.getByRole("button", { name: "보내기 좋게 바꿔주세요" }).click();
  await expect(page.getByText("이렇게 말해보세요.")).toBeVisible();
  expect(payload).toMatchObject({
    context: "DB 컬럼 미스 내일까지 보고 작성하세요.",
    rawReply: "개새끼야 니가 만든 거야 씨발새끼야",
  });
});
