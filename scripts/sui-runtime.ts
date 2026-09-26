import { decodeSuiPrivateKey, type Signer } from "@mysten/sui/cryptography";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import type { Transaction } from "@mysten/sui/transactions";
import { createdObjectsFromResult } from "@coffer/sui-client";

const DEFAULT_TESTNET_GRPC = "https://fullnode.testnet.sui.io:443";

const localEnvPath = resolve(process.cwd(), ".env");
if (existsSync(localEnvPath)) {
  process.loadEnvFile(localEnvPath);
}

export function loadDeploymentSigner(): Signer {
  const encoded = process.env.COFFER_TESTNET_PRIVATE_KEY;
  if (!encoded) {
    throw new Error(
      "COFFER_TESTNET_PRIVATE_KEY is required locally. Put a suiprivkey value in an untracked .env; never paste or commit it.",
    );
  }

  const { scheme, secretKey } = decodeSuiPrivateKey(encoded);
  switch (scheme) {
    case "ED25519":
      return Ed25519Keypair.fromSecretKey(secretKey);
    case "Secp256k1":
      return Secp256k1Keypair.fromSecretKey(secretKey);
    case "Secp256r1":
      return Secp256r1Keypair.fromSecretKey(secretKey);
    default:
      throw new Error(`Unsupported Sui key scheme: ${scheme}`);
  }
}

export function createTestnetClient(): SuiGrpcClient {
  return new SuiGrpcClient({
    network: "testnet",
    baseUrl: process.env.SUI_RPC_URL ?? DEFAULT_TESTNET_GRPC,
  });
}

export async function executeAndWait(
  client: SuiGrpcClient,
  signer: Signer,
  transaction: Transaction,
) {
  const result = await client.signAndExecuteTransaction({
    transaction,
    signer,
    include: { effects: true, objectTypes: true },
  });

  if (result.$kind === "FailedTransaction") {
    throw new Error(
      `Sui transaction failed: ${result.FailedTransaction.status.error?.message ?? "unknown execution error"}`,
    );
  }

  const indexed = await client.waitForTransaction({
    result,
    include: { effects: true, objectTypes: true },
  });
  if (indexed.$kind === "FailedTransaction") {
    throw new Error(
      `Sui transaction failed while indexing: ${indexed.FailedTransaction.status.error?.message ?? "unknown execution error"}`,
    );
  }

  return {
    digest: indexed.Transaction.digest,
    createdObjects: createdObjectsFromResult(indexed.Transaction),
  };
}
