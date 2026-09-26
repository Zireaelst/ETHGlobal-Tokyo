import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorialStory } from "../components/landing/editorial-story";
import { TESTNET_DEPLOYMENT } from "../lib/deployment";

describe("EditorialStory", () => {
  it("explains mandates, privacy, authorization, and audit truthfully", () => {
    render(<EditorialStory />);

    for (const heading of [
      "Give agents a mandate — not a wallet.",
      "Private commercial context. Verifiable financial execution.",
      "Humans approve exceptions. Not every transaction.",
      "Every decision leaves a receipt.",
      "Built for a programmable treasury ecosystem.",
      "Autonomous capital for the agentic era.",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }

    expect(
      screen.getByText("Amounts and recipient addresses remain public on Sui."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Event authorization uses mocked identities."),
    ).toBeInTheDocument();
  });

  it("links the real verified testnet executions", () => {
    render(<EditorialStory />);

    expect(screen.getByRole("link", { name: "View autonomous payment" })).toHaveAttribute(
      "href",
      `https://suiscan.xyz/testnet/tx/${TESTNET_DEPLOYMENT.agentDemo.executionDigest}`,
    );
    expect(screen.getByRole("link", { name: "View World-authorized payment" })).toHaveAttribute(
      "href",
      `https://suiscan.xyz/testnet/tx/${TESTNET_DEPLOYMENT.worldDemo.executionDigest}`,
    );
  });
});
