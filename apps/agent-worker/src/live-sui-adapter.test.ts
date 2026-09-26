import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import { describe, expect, it, vi } from "vitest";
import { canonicalActionDigest } from "@coffer/world-auth";
import { createLiveSuiAdapter } from "./live-sui-adapter";

const now = 1_800_000_000_000;
const action: ActionAuthorizationPayload = {
  treasuryId: "0xtreasury",
  paymentRequestId: "0xrequest",
  vendor: "0xvendor",
  amount: "300000000",
  expiresAtMs: now + 60_000,
  nonce: "0123456789abcdef0123456789abcdef",
};

function setup() {
  const reads = {
    payment: vi.fn().mockResolvedValue({
      id: "0xrequest",
      treasuryId: "0xtreasury",
      requester: "0xrequester",
      vendor: "0xvendor",
      amount: 300_000_000n,
      bucket: 2,
      dueAtMs: BigInt(now - 1_000),
      expiresAtMs: BigInt(now + 60_000),
      policyVersion: 1n,
      documentRef: {
        blobId: "walrus-blob",
        plaintextDigest: "ab".repeat(32),
        sealPolicyId: "0xtreasury",
      },
      actionDigest: canonicalActionDigest(action),
      status: 0,
    }),
    treasury: vi.fn().mockResolvedValue({
      id: "0xtreasury",
      organization: "Coffer Labs",
      operating: 1_000_000_000n,
      reserve: 2_000_000_000n,
      vendorCommitted: 700_000_000n,
      paused: false,
      policyVersion: 1n,
      totalPaid: 0n,
    }),
    mandate: vi.fn().mockResolvedValue({
      id: "0xmandate",
      treasuryId: "0xtreasury",
      agent: "0xagent",
      maxPerPayment: 500_000_000n,
      periodLimit: 2_000_000_000n,
      periodSpent: 100_000_000n,
      periodStartedAtMs: BigInt(now - 1_000),
      periodDurationMs: 86_400_000n,
      validFromMs: BigInt(now - 1_000),
      validUntilMs: BigInt(now + 60_000),
      approvalThreshold: 250_000_000n,
      maxRebalance: 500_000_000n,
      policyVersion: 1n,
      revoked: false,
    }),
    vendor: vi.fn().mockResolvedValue({
      id: "0xvendor-policy",
      treasuryId: "0xtreasury",
      vendor: "0xvendor",
      active: true,
      maxPayment: 500_000_000n,
      allowedBucket: 2,
      validUntilMs: BigInt(now + 60_000),
    }),
  };
  const execute = vi.fn().mockResolvedValue("tx-digest");
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({ authorizationUrl: "https://sandbox.auth.world.org/authorize" }),
  );
  const adapter = createLiveSuiAdapter({
    client: {} as never,
    deployment: {
      packageId: "0xpackage",
      coinType: "0xpackage::demo_usd::DEMO_USD",
      treasuryId: "0xtreasury",
      mandateId: "0xmandate",
      agentCapId: "0xagent-cap",
      vendorPolicyId: "0xvendor-policy",
    },
    agentAddress: "0xagent",
    now: () => now,
    reads,
    execute,
    worldGatewayUrl: "https://coffer.example",
    resolveAuthorizationAction: () => action,
    fetch: fetcher as unknown as typeof fetch,
  });
  return { adapter, reads, execute, fetcher };
}

describe("live Sui worker adapter", () => {
  it("derives policy context from live object snapshots", async () => {
    const { adapter } = setup();
    const request = await adapter.readPaymentRequest("0xrequest");
    const context = await adapter.readPolicyContext(request);

    expect(request.bucket).toBe("VENDOR_COMMITTED");
    expect(context).toMatchObject({
      treasuryActive: true,
      mandateActive: true,
      vendorApproved: true,
      humanApprovalThreshold: 250_000_000n,
      bucketBalance: 700_000_000n,
    });
  });

  it("submits an exact, digest-bound action to the World gateway", async () => {
    const { adapter, fetcher } = setup();
    const request = await adapter.readPaymentRequest("0xrequest");
    await adapter.requestHumanAuthorization(request, {
      decision: "HUMAN_AUTH_REQUIRED",
      reasonCodes: ["HUMAN_APPROVAL_THRESHOLD_EXCEEDED"],
      selectedBucket: "VENDOR_COMMITTED",
      policyVersion: 1,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://coffer.example/api/world/authorize",
      expect.objectContaining({ method: "POST", body: JSON.stringify(action) }),
    );
  });

  it("refuses a World action whose digest differs from the onchain commitment", async () => {
    const { adapter, reads, fetcher } = setup();
    reads.payment.mockResolvedValueOnce({
      ...(await reads.payment()),
      actionDigest: new Uint8Array(32),
    });
    const request = await adapter.readPaymentRequest("0xrequest");
    await expect(
      adapter.requestHumanAuthorization(request, {
        decision: "HUMAN_AUTH_REQUIRED",
        reasonCodes: ["HUMAN_APPROVAL_THRESHOLD_EXCEEDED"],
        selectedBucket: "VENDOR_COMMITTED",
        policyVersion: 1,
      }),
    ).rejects.toThrow("does not match");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
