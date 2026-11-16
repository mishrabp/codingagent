import { expect, test } from "@playwright/test";

test("board renders with seeded cards and allows creating a card", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Project Board" })).toBeVisible();
  await expect(page.getByText("Draft project brief")).toBeVisible();

  const taskTitle = page.getByLabel("Add a card to To do");
  await taskTitle.fill("Launch planning");
  await page.getByLabel("Details for To do").fill("Confirm milestones and owners for launch week.");
  await page.getByRole("button", { name: "Add card" }).first().click();

  await expect(page.getByText("Launch planning")).toBeVisible();
});
