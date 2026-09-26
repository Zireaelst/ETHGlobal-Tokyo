import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OverviewPage from "../app/app/overview/page";

describe("Treasury overview", () => {
  it("summarizes operational state without requiring a wallet", () => {
    render(<OverviewPage />);

    expect(screen.getByRole("heading", { name: "Treasury overview" })).toBeInTheDocument();
    for (const bucket of ["Operating", "Reserve", "Vendor committed"]) {
      expect(screen.getByRole("heading", { name: bucket })).toBeInTheDocument();
    }
    expect(screen.getByText("170 DEMO_USD autonomous headroom")).toBeInTheDocument();
    expect(screen.getByText("Mirai Logistics · 80 DEMO_USD")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reserve floor at risk on 30 Sep after the next committed obligation.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent agent actions" })).toBeInTheDocument();
    expect(screen.getAllByText(/Verified testnet run|Demo workspace data/).length).toBeGreaterThan(3);
    expect(screen.queryByText(/connect.*wallet/i)).not.toBeInTheDocument();
  });
});
