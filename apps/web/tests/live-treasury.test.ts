import type { ClientWithCoreApi } from "@mysten/sui/client";
import { describe, expect, it, vi } from "vitest";
import { TESTNET_DEPLOYMENT } from "../lib/deployment";
import { readTreasurySnapshot } from "../lib/sui/live-treasury";

function objectResult(objectId: string) {
  const isPackage = objectId === TESTNET_DEPLOYMENT.packageId;
  return {
    object: {
      objectId,
      version: "7",
      digest: `digest-${objectId.slice(-4)}`,
      owner: { $kind: "Shared", Shared: { initialSharedVersion: "1" } },
      type: isPackage ? "package" : `${TESTNET_DEPLOYMENT.packageId}::treasury::Treasury`,
      content: isPackage ? undefined : new Uint8Array([1, 2, 3]),
    },
  };
}

function transactionResult(digest: string) {
  return {
    $kind: "Transaction",
    Transaction: {
      digest,
      signatures: [],
      epoch: "123",
      timestampMs: 1_790_000_000_000,
      checkpoint: "456",
      status: { success: true, error: null },
      effects: { transactionDigest: digest },
      events: [{ eventType: `${TESTNET_DEPLOYMENT.packageId}::treasury::PaymentExecuted` }],
    },
  };
}

describe("live treasury reader", () => {
  it("reads the deployed package, treasury, and both verified executions", async () => {
    const getObject = vi.fn(async ({ objectId }: { objectId: string }) => objectResult(objectId));
    const getTransaction = vi.fn(async ({ digest }: { digest: string }) => transactionResult(digest));
    const client = { core: { getObject, getTransaction } } as unknown as ClientWithCoreApi;

    const snapshot = await readTreasurySnapshot(client, TESTNET_DEPLOYMENT);

    expect(snapshot.source).toBe("live");
    expect(getObject).toHaveBeenCalledWith({ objectId: TESTNET_DEPLOYMENT.packageId, include: { content: true } });
    expect(getObject).toHaveBeenCalledWith({ objectId: TESTNET_DEPLOYMENT.treasuryId, include: { content: true } });
    expect(getTransaction).toHaveBeenCalledWith({ digest: TESTNET_DEPLOYMENT.agentDemo.executionDigest, include: { effects: true, events: true } });
    expect(getTransaction).toHaveBeenCalledWith({ digest: TESTNET_DEPLOYMENT.worldDemo.executionDigest, include: { effects: true, events: true } });
    expect(snapshot).toMatchObject({
      package: { objectId: TESTNET_DEPLOYMENT.packageId, contentBytes: null },
      treasury: { objectId: TESTNET_DEPLOYMENT.treasuryId, contentBytes: 3 },
      transactions: [
        { digest: TESTNET_DEPLOYMENT.agentDemo.executionDigest, successful: true, eventCount: 1 },
        { digest: TESTNET_DEPLOYMENT.worldDemo.executionDigest, successful: true, eventCount: 1 },
      ],
    });
  });

  it("returns explicit verified provenance when RPC cannot confirm live state", async () => {
    const client = {
      core: {
        getObject: vi.fn().mockRejectedValue(new Error("network unavailable")),
        getTransaction: vi.fn(),
      },
    } as unknown as ClientWithCoreApi;

    const snapshot = await readTreasurySnapshot(client, TESTNET_DEPLOYMENT);

    expect(snapshot).toEqual({
      source: "verified",
      reason: "rpc_unavailable",
      packageId: TESTNET_DEPLOYMENT.packageId,
      treasuryId: TESTNET_DEPLOYMENT.treasuryId,
      transactionDigests: [
        TESTNET_DEPLOYMENT.agentDemo.executionDigest,
        TESTNET_DEPLOYMENT.worldDemo.executionDigest,
      ],
    });
  });

  it("does not call a failed transaction live evidence", async () => {
    const client = {
      core: {
        getObject: vi.fn(async ({ objectId }: { objectId: string }) => objectResult(objectId)),
        getTransaction: vi.fn(async ({ digest }: { digest: string }) => ({
          $kind: "FailedTransaction",
          FailedTransaction: { ...transactionResult(digest).Transaction, status: { success: false, error: {} } },
        })),
      },
    } as unknown as ClientWithCoreApi;

    expect((await readTreasurySnapshot(client, TESTNET_DEPLOYMENT)).source).toBe("verified");
  });
});
