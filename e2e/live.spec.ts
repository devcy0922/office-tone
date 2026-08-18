import { expect, test } from "@playwright/test";

const live = Boolean(process.env.E2E_LIVE);

test.skip(!live, "set E2E_LIVE=1 to hit a real rewrite endpoint");

test("golden path rewrite on the deployed app", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("무슨 일이었나요?").fill("요구사항이 계속 바뀌었습니다.");
  await page.getByLabel("하고 싶은 말은요?").fill(
    "아니 이거 요구사항이 계속 바뀐 건데 왜 제가 오늘 야근해서 맞춰야 하죠? 오늘은 어렵습니다.",
  );
  await page.getByRole("button", { name: "확실하게 말해요" }).click();
  await page.getByRole("button", { name: "보내기 좋게 바꿔주세요" }).click();
  await expect(page.getByText("이 중에 골라 보내세요.")).toBeVisible({ timeout: 45_000 });
  const body = await page.locator("main, body").innerText();
  expect(body).toMatch(/어렵|불가|할 수 없|진행할 수 없/);
  expect(body).toMatch(/요구사항|변경/);
  expect(body).not.toMatch(/최대한 해보|请|确认|问题/);
});
