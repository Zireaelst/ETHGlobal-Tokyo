import { render, screen, within } from "@testing-library/react";
import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import AppIndexPage from "../app/app/page";
import { AppShell } from "../components/app-shell/app-shell";
import { DataSourceBadge } from "../components/ui/data-source-badge";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/app/overview",
}));

const operationalRoutes = [
  ["Overview", "/app/overview"],
  ["Payment Requests", "/app/requests"],
  ["Approvals", "/app/approvals"],
  ["Mandates", "/app/mandates"],
  ["Standing Orders", "/app/standing-orders"],
  ["Audit", "/app/audit"],
] as const;

const institutionalRoutes = [
  ["Vendors", "/app/vendors"],
  ["Documents", "/app/documents"],
  ["Policies", "/app/policies"],
  ["Users", "/app/users"],
  ["Settings", "/app/settings"],
] as const;

describe("Coffer app shell", () => {
  it("exposes the full operational and institutional navigation", () => {
    render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", { name: "Workspace" });
    for (const [label, href] of [...operationalRoutes, ...institutionalRoutes]) {
      expect(within(navigation).getByRole("link", { name: new RegExp(label) })).toHaveAttribute(
        "href",
        href,
      );
    }
    expect(screen.getByText("Tokyo Operations Treasury")).toBeInTheDocument();
    expect(screen.getByText("Sui Testnet")).toBeInTheDocument();
    expect(screen.getByText("Demo workspace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to workspace content" })).toHaveAttribute(
      "href",
      "#workspace-content",
    );
  });

  it("renders the three exact provenance labels", () => {
    const { rerender } = render(<DataSourceBadge source="live" />);
    expect(screen.getByText("Live testnet")).toBeInTheDocument();
    rerender(<DataSourceBadge source="verified" />);
    expect(screen.getByText("Verified testnet run")).toBeInTheDocument();
    rerender(<DataSourceBadge source="demo" />);
    expect(screen.getByText("Demo workspace data")).toBeInTheDocument();
  });

  it("redirects the app index to overview", () => {
    AppIndexPage();
    expect(redirect).toHaveBeenCalledWith("/app/overview");
  });
});
