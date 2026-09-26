import { evaluatePayment } from "@coffer/policy-engine";
import {
  buildExecuteWithinMandate,
  buildSubmitRequest,
  createdObjectsFromResult,
  readAgentMandate,
  readTreasurySnapshot,
  readVendorPolicy,
  requireCreatedObject,
} from "@coffer/sui-client";
import { decodeSuiPrivateKey, type Signer } from "@mysten/sui/cryptography";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import type { Transaction } from "@mysten/sui/transactions";
import { TESTNET_DEPLOYMENT } from "../deployment";

type LiveEnvironment = Record<string, string | undefined>;

const LIVE_OBJECTS = Object.freeze({
  coinType: `${TESTNET_DEPLOYMENT.packageId}::demo_usd::DEMO_USD`,
  agentCapId: "0xa1843f9d7e1307798d6d0db4c36b400f415ab0908232a04330311c674f201ce9",
  mandateId: "0xcb3682df2aa97be8cea382cf6aa6f8426c522e9a5dc1bce604e49f1f7a788034",
  vendorCapId: "0x31c625d108160623fdb4386e1e05981a25fa3ab6ee26ee1a7d7fc26f696ce3ff",
  vendorPolicyId: "0xd20393bc550ce0d745f35eb71dd3ccbcab41438042d01819e4801e3bab0e2100",
  invoiceDigest: "e9fb7fe5169cb53b523a028305d6cf581c492a7d01130a4c49292fde67c64c24",
  sealPolicyId: TESTNET_DEPLOYMENT.treasuryId,
  walrusBlobId: TESTNET_DEPLOYMENT.agentDemo.documentBlobId,
});

export function getLiveAgentConfig(environment: LiveEnvironment = process.env) {
  if (environment.COFFER_LIVE_DEMO_ENABLED !== "true") {
    throw new Error("Live testnet demo is not enabled.");
  }
  const privateKey = environment.COFFER_TESTNET_PRIVATE_KEY?.trim();
  if (!privateKey) throw new Error("COFFER_TESTNET_PRIVATE_KEY is required on the server.");
  return { privateKey };
}

function signerFromPrivateKey(encoded: string): Signer {
  const { scheme, secretKey } = decodeSuiPrivateKey(encoded);
  if (scheme === "ED25519") return Ed25519Keypair.fromSecretKey(secretKey);
  if (scheme === "Secp256k1") return Secp256k1Keypair.fromSecretKey(secretKey);
  if (scheme === "Secp256r1") return Secp256r1Keypair.fromSecretKey(secretKey);
  throw new Error(`Unsupported Sui key scheme: ${scheme}`);
}

async function execute(client: SuiGrpcClient, signer: Signer, transaction: Transaction) {
  const submitted = await client.signAndExecuteTransaction({
    transaction,
    signer,
    include: { effects: true, objectTypes: true },
  });
  if (submitted.$kind === "FailedTransaction") {
    throw new Error(submitted.FailedTransaction.status.error?.message ?? "Sui execution failed.");
  }
  const indexed = await client.waitForTransaction({
    result: submitted,
    include: { effects: true, objectTypes: true },
  });
  if (indexed.$kind === "FailedTransaction") {
    throw new Error(indexed.FailedTransaction.status.error?.message ?? "Sui indexing failed.");
  }
  return indexed.Transaction;
}

export async function runLiveAgentDemo(environment: LiveEnvironment = process.env) {
  const config = getLiveAgentConfig(environment);
  const signer = signerFromPrivateKey(config.privateKey);
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: environment.SUI_RPC_URL ?? "https://fullnode.testnet.sui.io:443",
  });
  const now = Date.now();
  const amount = 80_000_000n;
  const [treasury, mandate, vendor] = await Promise.all([
    readTreasurySnapshot(client, TESTNET_DEPLOYMENT.treasuryId),
    readAgentMandate(client, LIVE_OBJECTS.mandateId),
    readVendorPolicy(client, LIVE_OBJECTS.vendorPolicyId),
  ]);
  const periodExpired = BigInt(now) >= mandate.periodStartedAtMs + mandate.periodDurationMs;
  const decision = evaluatePayment({
    extractionValid: true,
    extractionConfidence: 0.98,
    minimumExtractionConfidence: 0.85,
    treasuryActive: !treasury.paused,
    mandateActive:
      !mandate.revoked &&
      mandate.agent === signer.toSuiAddress() &&
      BigInt(now) >= mandate.validFromMs &&
      BigInt(now) <= mandate.validUntilMs,
    requestExpiresAtMs: now + 3_600_000,
    nowMs: now,
    requestPolicyVersion: Number(treasury.policyVersion),
    treasuryPolicyVersion: Number(treasury.policyVersion),
    vendorApproved:
      vendor.active &&
      vendor.vendor === signer.toSuiAddress() &&
      vendor.allowedBucket === 2 &&
      amount <= vendor.maxPayment &&
      BigInt(now) <= vendor.validUntilMs,
    amount,
    humanApprovalThreshold: mandate.approvalThreshold,
    perPaymentLimit: mandate.maxPerPayment,
    periodSpent: periodExpired ? 0n : mandate.periodSpent,
    periodLimit: mandate.periodLimit,
    bucketBalance: treasury.vendorCommitted,
    dueAtMs: now - 1_000,
    selectedBucket: "VENDOR_COMMITTED",
  });
  if (decision.decision !== "AUTO_EXECUTE") {
    throw new Error(`Current onchain policy returned ${decision.decision}: ${decision.reasonCodes.join(", ")}`);
  }

  const submitted = await execute(
    client,
    signer,
    buildSubmitRequest({
      packageId: TESTNET_DEPLOYMENT.packageId,
      coinType: LIVE_OBJECTS.coinType,
      vendorCapId: LIVE_OBJECTS.vendorCapId,
      vendorPolicyId: LIVE_OBJECTS.vendorPolicyId,
      treasuryId: TESTNET_DEPLOYMENT.treasuryId,
      amount,
      bucket: 2,
      dueAtMs: BigInt(now - 1_000),
      expiresAtMs: BigInt(now + 3_600_000),
      policyVersion: treasury.policyVersion,
      invoiceDigest: Uint8Array.from(Buffer.from(LIVE_OBJECTS.invoiceDigest, "hex")),
      walrusBlobId: LIVE_OBJECTS.walrusBlobId,
      sealPolicyId: LIVE_OBJECTS.sealPolicyId,
      actionDigest: new Uint8Array(),
    }),
  );
  const requestId = requireCreatedObject(
    createdObjectsFromResult(submitted),
    (object) => object.type.includes("::payment_request::PaymentRequest"),
    "Live payment request",
  );
  const executed = await execute(
    client,
    signer,
    buildExecuteWithinMandate({
      packageId: TESTNET_DEPLOYMENT.packageId,
      coinType: LIVE_OBJECTS.coinType,
      agentCap: LIVE_OBJECTS.agentCapId,
      mandate: LIVE_OBJECTS.mandateId,
      vendorPolicy: LIVE_OBJECTS.vendorPolicyId,
      treasury: TESTNET_DEPLOYMENT.treasuryId,
      request: requestId,
    }),
  );

  return {
    requestId,
    submitDigest: submitted.digest,
    executionDigest: executed.digest,
    decision: decision.decision,
    amountBaseUnits: amount.toString(),
    sourceBucket: "Vendor committed" as const,
  };
}
