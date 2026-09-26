import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LandingHeader } from "../components/landing/landing-header";

describe("LandingHeader", () => {
  it("exposes the approved desktop navigation and app destination", () => {
    render(<LandingHeader />);

    const navigation = screen.getByRole("navigation", { name: "Primary" });
    expect(within(navigation).getByRole("link", { name: "Product" })).toHaveAttribute(
      "href",
      "#product",
    );
    expect(
      within(navigation).getByRole("link", { name: "How it works" }),
    ).toHaveAttribute("href", "#how-it-works");
    expect(within(navigation).getByRole("link", { name: "Security" })).toHaveAttribute(
      "href",
      "#security",
    );
    expect(within(navigation).getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "#docs",
    );
    expect(screen.getByRole("link", { name: "Launch App" })).toHaveAttribute(
      "href",
      "/app/overview",
    );
  });

  it("opens and closes the mobile menu through every supported path", async () => {
    const user = userEvent.setup();
    render(<LandingHeader />);

    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Mobile navigation" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    await user.click(screen.getByTestId("menu-overlay"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    const mobileNavigation = screen.getByRole("navigation", { name: "Mobile" });
    await user.click(within(mobileNavigation).getByRole("link", { name: "Security" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 900 });
    fireEvent(window, new Event("resize"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
