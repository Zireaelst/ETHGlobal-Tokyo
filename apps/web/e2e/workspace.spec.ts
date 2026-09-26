import { expect, test } from "@playwright/test";

const worldDigest = "a".repeat(64);
const suiDigest = "8wPGFjnUvsh8QTwRMPwibpK9LDQUz6XTgupyPy5QyFx";

test.describe("institutional workspace", () => {
  test("is browsable without an account and marks data provenance", async ({ page }) => {
    await page.goto("/app/overview", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Treasury overview" })).toBeVisible();
    await expect(page.getByText("Policy-bound capital, obligations, and agent activity.")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Treasury buckets" }).getByText("Verified testnet run"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect account" })).toBeVisible();
  });

  test("shows every policy outcome and only exposes real receipt links", async ({ page }) => {
    await page.goto("/app/requests", { waitUntil: "domcontentloaded" });

    for (const requestId of ["REQ-2048", "REQ-2051", "REQ-2054", "REQ-2056"]) {
      await page.getByRole("link", { name: requestId }).click();
      const drawer = page.getByRole("dialog", { name: `Payment request ${requestId}` });
      await expect(drawer).toBeVisible();

      if (requestId === "REQ-2048" || requestId === "REQ-2051") {
        const receipt = drawer.getByRole("link", { name: "Open transaction in SuiScan" });
        await expect(receipt).toHaveAttribute("target", "_blank");
      } else {
        await expect(drawer.getByText("No transaction submitted")).toBeVisible();
      }

      await drawer.getByRole("link", { name: "Close payment request" }).click();
      await expect(drawer).toBeHidden();
    }
  });

  test("requires an account before a fresh World request and renders callback outcomes truthfully", async ({ page }) => {
    await page.goto("/app/approvals", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Authorize with World" }).click();
    const connectionDialog = page.getByRole("dialog", { name: /Connect to authorize with world/i });
    await expect(connectionDialog).toBeVisible();
    await expect(page.getByText("Coffer remains browsable without an account.")).toBeVisible();
    await expect(page.getByText("No Sui wallet detected. Install a wallet extension or use Google.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Sui Wallet" })).toHaveCount(0);

    const dialogBox = await connectionDialog.boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0) / 2 - (viewport?.width ?? 0) / 2)).toBeLessThan(2);
    expect(Math.abs((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0) / 2 - (viewport?.height ?? 0) / 2)).toBeLessThan(2);

    await page.goto(`/app/approvals?world_status=authorized&action_digest=${worldDigest}&transaction_digest=${suiDigest}`);
    await expect(page.getByRole("heading", { name: "Authorization verified and executed" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Verify World-authorized transaction" })).toHaveAttribute("target", "_blank");

    for (const [status, heading] of [
      ["cancelled", "Authorization cancelled"],
      ["rejected", "Authorization rejected"],
    ] as const) {
      await page.goto(`/app/approvals?world_status=${status}`);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByText("No balance change")).toBeVisible();
    }
  });
});
