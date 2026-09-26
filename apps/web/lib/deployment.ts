import rawDeployment from "../../../deployments/testnet.json";

type RawRecord = Record<string, unknown>;

function record(value: unknown, label: string): RawRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid testnet deployment: ${label} must be an object`);
  }
  return value as RawRecord;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid testnet deployment: ${label} must be a non-empty string`);
  }
  return value;
}

const root = record(rawDeployment, "root");
const agentDemo = record(root.agentDemo, "agentDemo");
const worldDemo = record(root.worldDemo, "worldDemo");
const pendingWorldDemo = record(root.pendingWorldDemo, "pendingWorldDemo");
const agentDocument = record(agentDemo.documentRef, "agentDemo.documentRef");
const worldDocument = record(worldDemo.documentRef, "worldDemo.documentRef");
const pendingWorldAction = record(pendingWorldDemo.action, "pendingWorldDemo.action");
const pendingWorldDocument = record(
  pendingWorldDemo.documentRef,
  "pendingWorldDemo.documentRef",
);

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid testnet deployment: ${label} must be a positive integer`);
  }
  return value;
}

export const TESTNET_DEPLOYMENT = Object.freeze({
  network: text(root.network, "network"),
  packageId: text(root.packageId, "packageId"),
  treasuryId: text(root.treasuryId, "treasuryId"),
  agentDemo: Object.freeze({
    documentBlobId: text(agentDocument.blobId, "agentDemo.documentRef.blobId"),
    executionDigest: text(agentDemo.executionDigest, "agentDemo.executionDigest"),
    submitDigest: text(agentDemo.submitDigest, "agentDemo.submitDigest"),
  }),
  worldDemo: Object.freeze({
    actionDigest: text(worldDemo.actionDigest, "worldDemo.actionDigest"),
    documentBlobId: text(worldDocument.blobId, "worldDemo.documentRef.blobId"),
    executionDigest: text(worldDemo.executionDigest, "worldDemo.executionDigest"),
    submitDigest: text(worldDemo.submitDigest, "worldDemo.submitDigest"),
  }),
  pendingWorldDemo: Object.freeze({
    action: Object.freeze({
      treasuryId: text(pendingWorldAction.treasuryId, "pendingWorldDemo.action.treasuryId"),
      paymentRequestId: text(
        pendingWorldAction.paymentRequestId,
        "pendingWorldDemo.action.paymentRequestId",
      ),
      vendor: text(pendingWorldAction.vendor, "pendingWorldDemo.action.vendor"),
      amount: text(pendingWorldAction.amount, "pendingWorldDemo.action.amount"),
      expiresAtMs: positiveInteger(
        pendingWorldAction.expiresAtMs,
        "pendingWorldDemo.action.expiresAtMs",
      ),
      nonce: text(pendingWorldAction.nonce, "pendingWorldDemo.action.nonce"),
    }),
    documentBlobId: text(
      pendingWorldDocument.blobId,
      "pendingWorldDemo.documentRef.blobId",
    ),
    submitDigest: text(pendingWorldDemo.submitDigest, "pendingWorldDemo.submitDigest"),
    bindDigest: text(pendingWorldDemo.bindDigest, "pendingWorldDemo.bindDigest"),
  }),
});

export type PublicDeployment = typeof TESTNET_DEPLOYMENT;

export function suiScanTransactionUrl(digest: string): string {
  return `https://suiscan.xyz/testnet/tx/${encodeURIComponent(digest)}`;
}

export function suiScanObjectUrl(objectId: string): string {
  return `https://suiscan.xyz/testnet/object/${encodeURIComponent(objectId)}`;
}
