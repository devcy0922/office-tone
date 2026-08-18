import { expect, test } from "@playwright/test";

test("first screen is the product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /할 말은 그대로/ })).toBeVisible();
  await expect(page.getByLabel("하고 싶은 말을 그대로 적어주세요")).toBeVisible();
  await expect(page.getByRole("button", { name: "보내기 좋게 바꿔주세요" })).toBeVisible();
  await expect(page.getByText("무난하게 말해요")).toBeVisible();
  await expect(page.getByText("Get Started")).toHaveCount(0);
});

test("preset is selectable and empty submit stays disabled", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "오늘은 참지 않아요" }).click();
  await expect(page.getByRole("button", { name: "오늘은 참지 않아요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "보내기 좋게 바꿔주세요" })).toBeDisabled();
});

test("rewrite result can be copied", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/rewrite", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rewritten: "오늘은 완료가 어렵습니다. 요구사항 변경 이후 일정 재조정이 필요합니다.",
        preserved: ["오늘 완료 불가", "요구사항 변경"],
        requestId: "test",
        model: "worker",
        latencyMs: 12,
        retryCount: 0,
      }),
    });
  });
  await page.goto("/");
  await page.getByLabel("하고 싶은 말을 그대로 적어주세요").fill("오늘은 못 합니다. 요구사항이 바뀌었습니다.");
  await expect(page.getByRole("button", { name: "보내기 좋게 바꿔주세요" })).toBeEnabled();
  await page.getByRole("button", { name: "보내기 좋게 바꿔주세요" }).click();
  await expect(page.getByText("이 정도면 보내도 괜찮아요.")).toBeVisible();
  await expect(page.getByText("오늘은 완료가 어렵습니다.")).toBeVisible();
  await page.getByRole("button", { name: "복사하기" }).click();
  await expect(page.getByRole("button", { name: "복사했어요" })).toBeVisible();
});
