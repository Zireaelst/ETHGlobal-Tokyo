import { SealClient, SessionKey } from "@mysten/seal";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { walrus } from "@mysten/walrus";
import { expect, it } from "vitest";
import { buildAgentDocumentApproval } from "./approval-transaction";
import { SealWalrusDocumentPrivacy } from "./seal-walrus";
import { AccessDeniedError } from "./types";

const requiredNames = [
  "COFFER_TESTNET_PRIVATE_KEY",
  "COFFER_PACKAGE_ID",
  "COFFER_TREASURY_ID",
  "COFFER_MANDATE_ID",
  "COFFER_AGENT_CAP_ID",
  "COFFER_COIN_TYPE",
] as const;

const sealServerConfigs = [
  {
    objectId:
      "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
    aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
    weight: 1,
  },
  {
    objectId:
      "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
    weight: 1,
  },
];

function requiredEnvironment(): Record<(typeof requiredNames)[number], string> {
  const missing = requiredNames.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Real Seal/Walrus test requires deployed objects and a funded testnet signer. Missing: ${missing.join(", ")}`,
    );
  }
  return Object.fromEntries(
    requiredNames.map((name) => [name, process.env[name] as string]),
  ) as Record<(typeof requiredNames)[number], string>;
}

it(
  "stores only ciphertext on Walrus and enforces the onchain Seal policy",
  async () => {
    const env = requiredEnvironment();
    const decoded = decodeSuiPrivateKey(env.COFFER_TESTNET_PRIVATE_KEY);
    if (decoded.scheme !== "ED25519") {
      throw new Error("The integration runner currently requires an Ed25519 testnet signer");
    }
    const signer = Ed25519Keypair.fromSecretKey(decoded.secretKey);
    const client = new SuiGrpcClient({
      network: "testnet",
      baseUrl: "https://fullnode.testnet.sui.io:443",
    }).$extend(
      walrus({
        uploadRelay: {
          host: "https://upload-relay.testnet.walrus.space",
          sendTip: { max: 1_000 },
        },
      }),
    );
    const seal = new SealClient({
      suiClient: client,
      serverConfigs: sealServerConfigs,
    });
    const sessionKey = await SessionKey.create({
      address: signer.toSuiAddress(),
      packageId: env.COFFER_PACKAGE_ID,
      ttlMin: 10,
      signer,
      suiClient: client,
    });
    const approval = (ref: Parameters<typeof buildAgentDocumentApproval>[0]["ref"]) =>
      buildAgentDocumentApproval({
        client,
        packageId: env.COFFER_PACKAGE_ID,
        coinType: env.COFFER_COIN_TYPE,
        treasuryId: env.COFFER_TREASURY_ID,
        mandateId: env.COFFER_MANDATE_ID,
        agentCapId: env.COFFER_AGENT_CAP_ID,
        sender: signer.toSuiAddress(),
        ref,
      });
    const privacy = new SealWalrusDocumentPrivacy({
      packageId: env.COFFER_PACKAGE_ID,
      policyId: env.COFFER_TREASURY_ID,
      threshold: 2,
      seal,
      walrus: client.walrus,
      signer,
      sessionKey,
      buildApprovalTransaction: approval,
    });

    const plaintext = new TextEncoder().encode("coffer-real-integration-document");
    const ref = await privacy.put(plaintext, env.COFFER_TREASURY_ID);
    expect(ref.blobId).not.toBe("");
    await expect(privacy.get(ref)).resolves.toEqual(plaintext);

    const unauthorizedSigner = new Ed25519Keypair();
    const unauthorizedSession = await SessionKey.create({
      address: unauthorizedSigner.toSuiAddress(),
      packageId: env.COFFER_PACKAGE_ID,
      ttlMin: 10,
      signer: unauthorizedSigner,
      suiClient: client,
    });
    const unauthorizedPrivacy = new SealWalrusDocumentPrivacy({
      packageId: env.COFFER_PACKAGE_ID,
      policyId: env.COFFER_TREASURY_ID,
      threshold: 2,
      // Secret-key shares are cached by SealClient for a full policy ID. A
      // separate identity must use a separate client instance in this test.
      seal: new SealClient({
        suiClient: client,
        serverConfigs: sealServerConfigs,
      }),
      walrus: client.walrus,
      signer,
      sessionKey: unauthorizedSession,
      buildApprovalTransaction: (documentRef) =>
        buildAgentDocumentApproval({
          client,
          packageId: env.COFFER_PACKAGE_ID,
          coinType: env.COFFER_COIN_TYPE,
          treasuryId: env.COFFER_TREASURY_ID,
          mandateId: env.COFFER_MANDATE_ID,
          agentCapId: env.COFFER_AGENT_CAP_ID,
          sender: unauthorizedSigner.toSuiAddress(),
          ref: documentRef,
        }),
    });
    await expect(unauthorizedPrivacy.get(ref)).rejects.toBeInstanceOf(
      AccessDeniedError,
    );
  },
  180_000,
);
