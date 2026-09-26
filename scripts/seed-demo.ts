import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCreateMandate,
  buildCreateStandingOrder,
  buildCreateTreasury,
  buildCreateVerifier,
  buildFundDemoTreasury,
  buildRegisterVendor,
  requireCreatedObject,
  type CreatedObject,
} from "@coffer/sui-client";
import {
  createTestnetClient,
  executeAndWait,
  loadDeploymentSigner,
} from "./sui-runtime";

type PublishedDeployment = {
  network: "testnet";
  packageId: string;
  coinType: string;
  demoUsdTreasuryCapId: string;
  [key: string]: unknown;
};

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deploymentPath = resolve(projectRoot, "deployments/testnet.json");

function loadDeployment(): PublishedDeployment {
  const value = JSON.parse(readFileSync(deploymentPath, "utf8")) as Partial<PublishedDeployment>;
  if (
    value.network !== "testnet" ||
    !value.packageId ||
    !value.coinType ||
    !value.demoUsdTreasuryCapId
  ) {
    throw new Error("Run pnpm publish:testnet before seeding the demo");
  }
  return value as PublishedDeployment;
}

function byType(objects: CreatedObject[], fragment: string, label: string) {
  return requireCreatedObject(
    objects,
    (object) => object.type.includes(fragment),
    label,
  );
}

async function main() {
  const deployment = loadDeployment();
  const signer = loadDeploymentSigner();
  const address = signer.toSuiAddress();
  const client = createTestnetClient();
  const shared = {
    packageId: deployment.packageId,
    coinType: deployment.coinType,
  };
  const now = BigInt(Date.now());
  const day = 86_400_000n;

  const treasuryResult = await executeAndWait(
    client,
    signer,
    buildCreateTreasury({
      ...shared,
      organization: "Coffer Tokyo Demo Treasury",
      adminAddress: address,
    }),
  );
  const treasuryId = byType(
    treasuryResult.createdObjects,
    "::treasury::Treasury<",
    "Treasury",
  );
  const adminCapId = byType(
    treasuryResult.createdObjects,
    "::treasury::TreasuryAdminCap",
    "Treasury admin capability",
  );

  const fundingResult = await executeAndWait(
    client,
    signer,
    buildFundDemoTreasury({
      ...shared,
      demoTreasuryCapId: deployment.demoUsdTreasuryCapId,
      adminCapId,
      treasuryId,
      mintAmount: 10_000_000_000n,
      vendorCommittedAmount: 4_000_000_000n,
    }),
  );

  const mandateResult = await executeAndWait(
    client,
    signer,
    buildCreateMandate({
      ...shared,
      adminCapId,
      treasuryId,
      agent: address,
      maxPerPayment: 500_000_000n,
      periodLimit: 2_000_000_000n,
      periodDurationMs: 30n * day,
      validFromMs: now,
      validUntilMs: now + 365n * day,
      approvalThreshold: 250_000_000n,
      maxRebalance: 1_000_000_000n,
      policyVersion: 1n,
    }),
  );
  const mandateId = byType(
    mandateResult.createdObjects,
    "::mandate::AgentMandate",
    "Agent mandate",
  );
  const agentCapId = byType(
    mandateResult.createdObjects,
    "::mandate::AgentCap",
    "Agent capability",
  );

  const vendorResult = await executeAndWait(
    client,
    signer,
    buildRegisterVendor({
      ...shared,
      adminCapId,
      treasuryId,
      vendor: address,
      active: true,
      maxPayment: 500_000_000n,
      allowedBucket: 2,
      validUntilMs: now + 365n * day,
    }),
  );
  const vendorPolicyId = byType(
    vendorResult.createdObjects,
    "::vendor_registry::VendorPolicy",
    "Vendor policy",
  );
  const vendorCapId = byType(
    vendorResult.createdObjects,
    "::vendor_registry::VendorCap",
    "Vendor capability",
  );

  const verifierResult = await executeAndWait(
    client,
    signer,
    buildCreateVerifier({
      ...shared,
      adminCapId,
      treasuryId,
      recipient: address,
    }),
  );
  const worldVerifierCapId = byType(
    verifierResult.createdObjects,
    "::authorization::WorldVerifierCap",
    "World verifier capability",
  );

  const standingOrderResult = await executeAndWait(
    client,
    signer,
    buildCreateStandingOrder({
      ...shared,
      adminCapId,
      treasuryId,
      vendor: address,
      amount: 80_000_000n,
      bucket: 2,
      intervalMs: 30n * day,
      nextExecutionAtMs: now + day,
      endAtMs: now + 365n * day,
      maxExecutions: 12n,
      policyVersion: 1n,
    }),
  );
  const standingOrderId = byType(
    standingOrderResult.createdObjects,
    "::standing_order::StandingOrder",
    "Standing order",
  );

  const { worldDemo: _oldWorldDemo, agentDemo: _oldAgentDemo, ...cleanDeployment } =
    deployment;
  const seeded = {
    ...cleanDeployment,
    deployer: address,
    treasuryId,
    adminCapId,
    mandateId,
    agentCapId,
    vendorPolicyId,
    vendorCapId,
    worldVerifierCapId,
    standingOrderId,
    transactionDigests: {
      treasury: treasuryResult.digest,
      funding: fundingResult.digest,
      mandate: mandateResult.digest,
      vendor: vendorResult.digest,
      worldVerifier: verifierResult.digest,
      standingOrder: standingOrderResult.digest,
    },
  };
  writeFileSync(deploymentPath, `${JSON.stringify(seeded, null, 2)}\n`);
  console.log(JSON.stringify(seeded, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
