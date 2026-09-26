import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";

describe("Coffer web shell", () => {
  it("introduces the product and links to the demo workspace", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Autonomous Treasury. Within Your Rules.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Launch Demo" })).toHaveAttribute(
      "href",
      "/app/overview",
    );
  });
});
