import { expect, test } from "@playwright/test";

test.describe("public landing", () => {
  test("connects the hero to the editorial control story and workspace", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Autonomous Treasury. Within Your Rules." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Launch Demo/i })).toHaveAttribute("href", "/app/overview");

    await page.getByRole("link", { name: "How it works", exact: true }).click();
    await expect(page.locator("#how-it-works")).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Give agents a mandate — not a wallet." })).toBeVisible();

    await page.getByRole("link", { name: "Security" }).click();
    await expect(page.locator("#security")).toBeInViewport();
    await expect(page.getByText("Amounts and recipient addresses remain public on Sui.")).toBeVisible();
  });

  test("opens the mobile menu and places keyboard focus inside its dialog", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog", { name: "Mobile navigation" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
