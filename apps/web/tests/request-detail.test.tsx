import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequestDetailDrawer } from "../components/requests/request-detail-drawer";
import { DEMO_REQUESTS } from "../lib/demo/fixtures";

describe("RequestDetailDrawer", () => {
  for (const request of DEMO_REQUESTS) {
    it(`renders the complete ${request.outcome} decision for ${request.id}`, () => {
      render(<RequestDetailDrawer request={request} />);

      expect(screen.getByRole("dialog", { name: `Payment request ${request.id}` })).toBeVisible();
      expect(screen.getByText(request.vendor)).toBeInTheDocument();
      expect(screen.getByText(request.sourceBucket)).toBeInTheDocument();
      expect(screen.getByText(request.document.displayName)).toBeInTheDocument();
      expect(screen.getByText(`${Math.round(request.extractionConfidence * 100)}%`)).toBeInTheDocument();
      expect(screen.getByText(request.reasonCode)).toBeInTheDocument();
      for (const check of request.checks) {
        expect(screen.getByText(check.label)).toBeInTheDocument();
      }

      if (request.transactionDigest) {
        expect(screen.getByText("Verified testnet run")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open transaction in SuiScan" })).toHaveAttribute(
          "href",
          `https://suiscan.xyz/testnet/tx/${request.transactionDigest}`,
        );
      } else {
        expect(screen.getByText("No transaction submitted")).toBeInTheDocument();
      }
    });
  }
});
