import { bcs } from "@mysten/sui/bcs";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { describe, expect, it } from "vitest";
import { readPaymentRequest, readTreasurySnapshot } from "./readers";

const UID = bcs.struct("UID", { id: bcs.Address });
const Balance = bcs.struct("Balance", { value: bcs.u64() });

function fakeClient(content: Uint8Array, objectId = "0x101") {
  return {
    core: {
      async getObject() {
        return {
          object: {
            objectId: normalizeSuiAddress(objectId),
            content,
          },
        };
      },
    },
  } as unknown as ClientWithCoreApi;
}

describe("typed Sui readers", () => {
  it("parses a treasury from portable BCS content", async () => {
    const schema = bcs.struct("Treasury", {
      id: UID,
      organization: bcs.string(),
      operating: Balance,
      reserve: Balance,
      vendor_committed: Balance,
      paused: bcs.bool(),
      policy_version: bcs.u64(),
      total_paid: bcs.u64(),
    });
    const content = schema.serialize({
      id: { id: normalizeSuiAddress("0x101") },
      organization: "Tokyo Treasury",
      operating: { value: 500n },
      reserve: { value: 300n },
      vendor_committed: { value: 200n },
      paused: false,
      policy_version: 3n,
      total_paid: 80n,
    }).toBytes();

    await expect(readTreasurySnapshot(fakeClient(content), "0x101")).resolves.toEqual({
      id: normalizeSuiAddress("0x101"),
      organization: "Tokyo Treasury",
      operating: 500n,
      reserve: 300n,
      vendorCommitted: 200n,
      paused: false,
      policyVersion: 3n,
      totalPaid: 80n,
    });
  });

  it("parses encrypted document commitments from a payment request", async () => {
    const schema = bcs.struct("PaymentRequest", {
      id: UID,
      treasury_id: bcs.Address,
      requester: bcs.Address,
      vendor: bcs.Address,
      amount: bcs.u64(),
      bucket: bcs.u8(),
      due_at_ms: bcs.u64(),
      expires_at_ms: bcs.u64(),
      policy_version: bcs.u64(),
      invoice_digest: bcs.vector(bcs.u8()),
      walrus_blob_id: bcs.string(),
      seal_policy_id: bcs.Address,
      action_digest: bcs.vector(bcs.u8()),
      status: bcs.u8(),
    });
    const digest = new Uint8Array(32).fill(7);
    const content = schema.serialize({
      id: { id: normalizeSuiAddress("0x105") },
      treasury_id: normalizeSuiAddress("0x101"),
      requester: normalizeSuiAddress("0xcafe"),
      vendor: normalizeSuiAddress("0xcafe"),
      amount: 240n,
      bucket: 2,
      due_at_ms: 1_000n,
      expires_at_ms: 5_000n,
      policy_version: 1n,
      invoice_digest: Array.from(digest),
      walrus_blob_id: "blob-123",
      seal_policy_id: normalizeSuiAddress("0x101"),
      action_digest: Array.from(new Uint8Array(32).fill(9)),
      status: 0,
    }).toBytes();

    const request = await readPaymentRequest(fakeClient(content, "0x105"), "0x105");
    expect(request.documentRef).toEqual({
      blobId: "blob-123",
      plaintextDigest: Buffer.from(digest).toString("hex"),
      sealPolicyId: normalizeSuiAddress("0x101"),
    });
    expect(request.amount).toBe(240n);
  });
});
