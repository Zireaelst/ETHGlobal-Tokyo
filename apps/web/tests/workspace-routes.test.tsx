import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ApprovalsPage from "../app/app/approvals/page";
import AuditPage from "../app/app/audit/page";
import DocumentsPage from "../app/app/documents/page";
import MandatesPage from "../app/app/mandates/page";
import PoliciesPage from "../app/app/policies/page";
import SettingsPage from "../app/app/settings/page";
import StandingOrdersPage from "../app/app/standing-orders/page";
import UsersPage from "../app/app/users/page";
import VendorsPage from "../app/app/vendors/page";

describe("workspace routes", () => {
  it("separates pending approvals from completed authorization evidence", async () => {
    render(await ApprovalsPage());

    expect(screen.getByRole("heading", { name: "Approval queue" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Pending approvals" })).toHaveTextContent(
      "Awaiting a fresh human decision",
    );
    expect(screen.getByRole("region", { name: "Completed approvals" })).toHaveTextContent(
      "World-authorized testnet execution",
    );
  });

  it("shows the enforceable mandate boundaries", () => {
    render(<MandatesPage />);

    expect(screen.getByRole("heading", { name: "Agent mandate" })).toBeInTheDocument();
    expect(screen.getByText("250 DEMO_USD")).toBeInTheDocument();
    expect(screen.getByText("Approved vendors")).toBeInTheDocument();
    expect(screen.getByText("30 Sep 2026, 23:59 JST")).toBeInTheDocument();
    expect(screen.getByText("Policy 3.2.1")).toBeInTheDocument();
    expect(screen.getByText("Not revoked")).toBeInTheDocument();
  });

  it("renders the recurring schedule with its next run and source bucket", () => {
    render(<StandingOrdersPage />);

    const schedule = screen.getByRole("region", { name: "Active standing orders" });
    expect(within(schedule).getByText("Mirai Logistics")).toBeInTheDocument();
    expect(within(schedule).getByText("29 Sep 2026, 18:00 JST")).toBeInTheDocument();
    expect(within(schedule).getByText("Vendor committed")).toBeInTheDocument();
  });

  it("presents an auditable decision-to-receipt sequence", () => {
    render(<AuditPage />);

    const timeline = screen.getByRole("list", { name: "Decision to receipt timeline" });
    expect(within(timeline).getByText("Request ingested")).toBeInTheDocument();
    expect(within(timeline).getByText("Policy evaluated")).toBeInTheDocument();
    expect(within(timeline).getByText("Execution receipt recorded")).toBeInTheDocument();
  });

  for (const [Page, heading] of [
    [VendorsPage, "Vendor registry"],
    [DocumentsPage, "Commercial documents"],
    [PoliciesPage, "Policy registry"],
    [UsersPage, "Users and roles"],
    [SettingsPage, "Workspace settings"],
  ] as const) {
    it(`${heading} is explicitly read-only demo data`, () => {
      render(<Page />);

      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      expect(screen.getByText("Demo workspace data")).toBeInTheDocument();
      expect(screen.getByText("Read-only in this build")).toBeInTheDocument();
    });
  }
});
