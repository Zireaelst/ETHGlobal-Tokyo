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

export const TESTNET_DEPLOYMENT = Object.freeze({
  network: text(root.network, "network"),
  packageId: text(root.packageId, "packageId"),
  treasuryId: text(root.treasuryId, "treasuryId"),
  agentDemo: Object.freeze({
    executionDigest: text(agentDemo.executionDigest, "agentDemo.executionDigest"),
    submitDigest: text(agentDemo.submitDigest, "agentDemo.submitDigest"),
  }),
  worldDemo: Object.freeze({
    actionDigest: text(worldDemo.actionDigest, "worldDemo.actionDigest"),
    executionDigest: text(worldDemo.executionDigest, "worldDemo.executionDigest"),
    submitDigest: text(worldDemo.submitDigest, "worldDemo.submitDigest"),
  }),
});

export function suiScanTransactionUrl(digest: string): string {
  return `https://suiscan.xyz/testnet/tx/${encodeURIComponent(digest)}`;
}

export function suiScanObjectUrl(objectId: string): string {
  return `https://suiscan.xyz/testnet/object/${encodeURIComponent(objectId)}`;
}
