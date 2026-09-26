import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationResult } from "../components/requests/authorization-result";
import { RequestDetailDrawer } from "../components/requests/request-detail-drawer";
import { WorldAuthorizationButton } from "../components/requests/world-authorization-button";
import { DEMO_REQUESTS } from "../lib/demo/fixtures";

const beginWorldAuthorization = vi.hoisted(() => vi.fn());

vi.mock("../lib/world/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/world/client")>();
  return { ...actual, beginWorldAuthorization };
});

vi.mock("../components/connection/action-gate", () => ({
  ActionGate: ({ actionLabel, onConnectedAction }: { actionLabel: string; onConnectedAction: () => void }) => (
    <button data-testid="action-gate" onClick={onConnectedAction} type="button">{actionLabel}</button>
  ),
}));

const action = {
  treasuryId: "0xtreasury",
  paymentRequestId: "0xrequest",
  vendor: "0xvendor",
  amount: "420000000",
  expiresAtMs: 1_800_000_120_000,
  nonce: "action-nonce-00000001",
};
const actionDigest = "a".repeat(64);
const transactionDigest = "8wPGFjnUvsh8QTwRMPwibpK9LDQUz6XTgupyPy5QyFx";

describe("fresh World authorization UI", () => {
  it("passes through the account action gate before opening World", async () => {
    beginWorldAuthorization.mockResolvedValueOnce({
      authorizationUrl: "https://sandbox.auth.world.org/api/v1/authorize?state=fresh",
      actionDigest,
    });
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<WorldAuthorizationButton action={action} navigate={navigate} />);

    expect(screen.getByTestId("action-gate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Authorize with World" }));

    expect(beginWorldAuthorization).toHaveBeenCalledWith(action);
    expect(navigate).toHaveBeenCalledWith(
      "https://sandbox.auth.world.org/api/v1/authorize?state=fresh",
    );
  });

  it("shows success only with both valid server-returned digests", () => {
    render(<AuthorizationResult query={{
      world_status: "authorized",
      action_digest: actionDigest,
      transaction_digest: transactionDigest,
    }} />);

    expect(screen.getByRole("heading", { name: "Authorization verified and executed" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verify World-authorized transaction" })).toHaveAttribute(
      "href",
      `https://suiscan.xyz/testnet/tx/${transactionDigest}`,
    );
    expect(screen.getByText("World event identity is mocked; server validation and action binding are real.")).toBeInTheDocument();
  });

  it.each(["cancelled", "expired", "replayed", "rejected", "failed"])(
    "keeps %s outcomes non-successful",
    (status) => {
      render(<AuthorizationResult query={{ world_status: status }} />);
      expect(screen.getByText("No balance change")).toBeInTheDocument();
      expect(screen.queryByText("Authorization verified and executed")).not.toBeInTheDocument();
    },
  );

  it("downgrades malformed authorized callbacks to an invalid result", () => {
    render(<AuthorizationResult query={{ world_status: "authorized", action_digest: "bad" }} />);
    expect(screen.getByRole("heading", { name: "Invalid authorization result" })).toBeInTheDocument();
    expect(screen.getByText("No balance change")).toBeInTheDocument();
  });

  it("labels the completed World request as immutable history", () => {
    const historical = DEMO_REQUESTS.find((request) => request.outcome === "human_authorization");
    if (!historical) throw new Error("World history fixture is required");

    render(<RequestDetailDrawer request={historical} />);

    expect(screen.getByText("Historical World authorization · already executed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Authorize with World" })).not.toBeInTheDocument();
  });
});
