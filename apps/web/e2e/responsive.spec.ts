import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

for (const viewport of viewports) {
  test(`has no page-level horizontal overflow at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/app/requests?request=REQ-2054");

    await expect(page.getByRole("dialog", { name: "Payment request REQ-2054" })).toBeVisible();
    const measurements = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(measurements.scrollWidth).toBeLessThanOrEqual(measurements.clientWidth);
  });
}
