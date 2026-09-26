import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SealClient, SessionKey } from "@mysten/seal";
import { walrus } from "@mysten/walrus";
import {
  buildAgentDocumentApproval,
  SealWalrusDocumentPrivacy,
} from "@coffer/document-privacy";
import {
  buildBindWorldAction,
  buildSubmitRequest,
  requireCreatedObject,
} from "@coffer/sui-client";
import { canonicalActionDigest } from "@coffer/world-auth";
import {
  createTestnetClient,
  executeAndWait,
  loadDeploymentSigner,
} from "./sui-runtime";

process.loadEnvFile();

const sealServerConfigs = [
  {
    objectId: "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
    aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
    weight: 1,
  },
  {
    objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
    weight: 1,
  },
];

async function main() {
  const demoKey = process.env.COFFER_DEMO_KEY ?? "worldDemo";
  if (
    demoKey !== "worldDemo" &&
    demoKey !== "agentDemo" &&
    demoKey !== "pendingWorldDemo"
  ) {
    throw new Error(
      "COFFER_DEMO_KEY must be worldDemo, agentDemo, or pendingWorldDemo",
    );
  }
  const amountText = process.env.COFFER_DEMO_AMOUNT_BASE_UNITS ?? "300000000";
  if (!/^\d+$/.test(amountText)) {
    throw new Error("COFFER_DEMO_AMOUNT_BASE_UNITS must be an integer");
  }
  const amount = BigInt(amountText);
  const deploymentPath = resolve(process.cwd(), "deployments/testnet.json");
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8")) as Record<
    string,
    string | object
  >;
  const required = [
    "packageId",
    "coinType",
    "treasuryId",
    "mandateId",
    "agentCapId",
    "vendorPolicyId",
    "vendorCapId",
    "deployer",
  ] as const;
  for (const name of required) {
    if (typeof deployment[name] !== "string") {
      throw new Error(`Deployment is missing ${name}; publish and seed first`);
    }
  }

  const signer = loadDeploymentSigner();
  const baseClient = createTestnetClient();
  const client = baseClient.$extend(
    walrus({
      uploadRelay: {
        host: "https://upload-relay.testnet.walrus.space",
        sendTip: { max: 1_000 },
      },
    }),
  );
  const seal = new SealClient({ suiClient: client, serverConfigs: sealServerConfigs });
  const sessionKey = await SessionKey.create({
    address: signer.toSuiAddress(),
    packageId: deployment.packageId as string,
    ttlMin: 10,
    signer,
    suiClient: client,
  });
  const privacy = new SealWalrusDocumentPrivacy({
    packageId: deployment.packageId as string,
    policyId: deployment.treasuryId as string,
    threshold: 2,
    seal,
    walrus: client.walrus,
    signer,
    sessionKey,
    buildApprovalTransaction: (ref) =>
      buildAgentDocumentApproval({
        client,
        packageId: deployment.packageId as string,
        coinType: deployment.coinType as string,
        treasuryId: deployment.treasuryId as string,
        mandateId: deployment.mandateId as string,
        agentCapId: deployment.agentCapId as string,
        sender: signer.toSuiAddress(),
        ref,
      }),
  });

  const now = Date.now();
  const expiresAtMs =
    now + Number(process.env.COFFER_DEMO_EXPIRY_MS ?? 7 * 24 * 60 * 60_000);
  const invoice = new TextEncoder().encode(
    JSON.stringify({
      vendor: "Tokyo Cloud Ltd.",
      invoiceNumber: `${demoKey === "agentDemo" ? "AGENT" : "WORLD"}-${now}`,
      amount: Number(amount) / 1_000_000,
      currency: "DEMO_USD",
      dueAtMs: now - 1_000,
      purchaseOrder: "PO-WORLD-001",
      lineItems: ["Institutional compute services"],
    }),
  );
  const documentRef = await privacy.put(invoice, deployment.treasuryId as string);
  const submit = await executeAndWait(
    baseClient,
    signer,
    buildSubmitRequest({
      packageId: deployment.packageId as string,
      coinType: deployment.coinType as string,
      vendorCapId: deployment.vendorCapId as string,
      vendorPolicyId: deployment.vendorPolicyId as string,
      treasuryId: deployment.treasuryId as string,
      amount,
      bucket: 2,
      dueAtMs: BigInt(now - 1_000),
      expiresAtMs: BigInt(expiresAtMs),
      policyVersion: 1n,
      invoiceDigest: Uint8Array.from(Buffer.from(documentRef.plaintextDigest, "hex")),
      walrusBlobId: documentRef.blobId,
      sealPolicyId: documentRef.sealPolicyId,
      actionDigest: new Uint8Array(),
    }),
  );
  const paymentRequestId = requireCreatedObject(
    submit.createdObjects,
    (object) => object.type.includes("::payment_request::PaymentRequest"),
    "World demo payment request",
  );
  const action = {
    treasuryId: deployment.treasuryId as string,
    paymentRequestId,
    vendor: deployment.deployer as string,
    amount: amount.toString(),
    expiresAtMs,
    nonce: randomBytes(24).toString("hex"),
  };
  const actionDigest = canonicalActionDigest(action);
  const bind = await executeAndWait(
    baseClient,
    signer,
    buildBindWorldAction({
      packageId: deployment.packageId as string,
      vendorCapId: deployment.vendorCapId as string,
      vendorPolicyId: deployment.vendorPolicyId as string,
      requestId: paymentRequestId,
      actionDigest,
    }),
  );

  const nextDeployment = {
    ...deployment,
    [demoKey]: {
      action,
      documentRef,
      submitDigest: submit.digest,
      bindDigest: bind.digest,
    },
  };
  writeFileSync(deploymentPath, `${JSON.stringify(nextDeployment, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        paymentRequestId,
        walrusBlobId: documentRef.blobId,
        actionDigest: Buffer.from(actionDigest).toString("hex"),
        submitDigest: submit.digest,
        bindDigest: bind.digest,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
