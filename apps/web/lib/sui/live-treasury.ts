import type { ClientWithCoreApi } from "@mysten/sui/client";
import type { PublicDeployment } from "../deployment";

type LiveObjectEvidence = {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  contentBytes: number | null;
};

type LiveTransactionEvidence = {
  digest: string;
  successful: true;
  checkpoint: string | null;
  timestampMs: number | null;
  eventCount: number;
};

export type LiveTreasurySnapshot = {
  source: "live";
  fetchedAt: string;
  package: LiveObjectEvidence;
  treasury: LiveObjectEvidence;
  transactions: readonly LiveTransactionEvidence[];
};

export type VerifiedTreasuryFallback = {
  source: "verified";
  reason: "rpc_unavailable";
  packageId: string;
  treasuryId: string;
  transactionDigests: readonly [string, string];
};

export type TreasurySnapshot = LiveTreasurySnapshot | VerifiedTreasuryFallback;

function fallback(deployment: PublicDeployment): VerifiedTreasuryFallback {
  return {
    source: "verified",
    reason: "rpc_unavailable",
    packageId: deployment.packageId,
    treasuryId: deployment.treasuryId,
    transactionDigests: [
      deployment.agentDemo.executionDigest,
      deployment.worldDemo.executionDigest,
    ],
  };
}

export async function readTreasurySnapshot(
  client: ClientWithCoreApi,
  deployment: PublicDeployment,
  signal?: AbortSignal,
): Promise<TreasurySnapshot> {
  const objectOptions = (objectId: string) => ({
    objectId,
    include: { content: true as const },
    ...(signal ? { signal } : {}),
  });
  const transactionOptions = (digest: string) => ({
    digest,
    include: { effects: true as const, events: true as const },
    ...(signal ? { signal } : {}),
  });

  try {
    const [packageResult, treasuryResult, autonomousResult, authorizedResult] = await Promise.all([
      client.core.getObject(objectOptions(deployment.packageId)),
      client.core.getObject(objectOptions(deployment.treasuryId)),
      client.core.getTransaction(transactionOptions(deployment.agentDemo.executionDigest)),
      client.core.getTransaction(transactionOptions(deployment.worldDemo.executionDigest)),
    ]);

    const mapObject = (
      result: typeof packageResult,
      contentRequired: boolean,
    ): LiveObjectEvidence => {
      if (contentRequired && !result.object.content) {
        throw new Error("Requested Sui object content is unavailable.");
      }
      return {
        objectId: result.object.objectId,
        version: result.object.version,
        digest: result.object.digest,
        type: result.object.type,
        contentBytes: result.object.content?.byteLength ?? null,
      };
    };

    const mapTransaction = (
      result: typeof autonomousResult,
    ): LiveTransactionEvidence => {
      if (result.$kind !== "Transaction" || !result.Transaction.status.success) {
        throw new Error("A configured testnet transaction did not execute successfully.");
      }
      if (!result.Transaction.effects || !result.Transaction.events) {
        throw new Error("Requested transaction evidence is unavailable.");
      }
      return {
        digest: result.Transaction.digest,
        successful: true,
        checkpoint: result.Transaction.checkpoint,
        timestampMs: result.Transaction.timestampMs,
        eventCount: result.Transaction.events.length,
      };
    };

    return {
      source: "live",
      fetchedAt: new Date().toISOString(),
      package: mapObject(packageResult, false),
      treasury: mapObject(treasuryResult, true),
      transactions: [mapTransaction(autonomousResult), mapTransaction(authorizedResult)],
    };
  } catch {
    return fallback(deployment);
  }
}
