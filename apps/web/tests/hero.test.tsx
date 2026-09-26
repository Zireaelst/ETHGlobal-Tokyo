import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "../components/landing/hero";

describe("Hero", () => {
  it("presents the approved product promise and truthful facts", () => {
    render(<Hero />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Autonomous Treasury. Within Your Rules.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI operates within enforceable spending mandates. Humans control the exceptions.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Launch Demo" })).toHaveAttribute(
      "href",
      "/app/overview",
    );
    expect(screen.getByRole("link", { name: "See how it works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );

    const facts = screen.getByRole("list", { name: "Product facts" });
    for (const fact of [
      "3 Treasury Buckets",
      "4 Agent Outcomes",
      "1× Action-bound Authorization",
      "2 Access Paths",
    ]) {
      expect(within(facts).getByText(fact)).toBeInTheDocument();
    }
  });

  it("labels temporary integration marks without imitating sponsor logos", () => {
    render(<Hero />);

    const integrations = screen.getByRole("list", { name: "Technology stack" });
    for (const name of ["Sui", "World", "Seal", "Walrus"]) {
      expect(within(integrations).getByText(name)).toBeInTheDocument();
    }
    expect(within(integrations).getByText("Policy-enforced on Sui")).toBeInTheDocument();
  });
});
