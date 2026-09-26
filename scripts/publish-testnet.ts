import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseMoveBuildOutput,
  requireCreatedObject,
} from "@coffer/sui-client";
import { Transaction } from "@mysten/sui/transactions";
import {
  createTestnetClient,
  executeAndWait,
  loadDeploymentSigner,
} from "./sui-runtime";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deploymentPath = resolve(projectRoot, "deployments/testnet.json");
const movePackagePath = resolve(projectRoot, "move/coffer");

async function main() {
  const signer = loadDeploymentSigner();
  const sender = signer.toSuiAddress();
  const client = createTestnetClient();
  const buildOutput = execFileSync(
    "sui",
    ["move", "build", "--dump-bytecode-as-base64", "--ignore-chain"],
    { cwd: movePackagePath, encoding: "utf8" },
  );
  const build = parseMoveBuildOutput(buildOutput);

  const transaction = new Transaction();
  const upgradeCap = transaction.publish({
    modules: build.modules,
    dependencies: build.dependencies,
  });
  transaction.transferObjects([upgradeCap], transaction.pure.address(sender));

  const executed = await executeAndWait(client, signer, transaction);
  const packageId = requireCreatedObject(
    executed.createdObjects,
    (object) => object.type === "package",
    "Coffer package",
  );
  const demoUsdTreasuryCapId = requireCreatedObject(
    executed.createdObjects,
    (object) =>
      object.type.includes("::coin::TreasuryCap<") &&
      object.type.includes("::demo_usd::DEMO_USD>"),
    "DEMO_USD treasury capability",
  );

  const previous = JSON.parse(readFileSync(deploymentPath, "utf8")) as Record<
    string,
    unknown
  >;
  const deployment = {
    ...previous,
    network: "testnet",
    publisher: sender,
    packageId,
    coinType: `${packageId}::demo_usd::DEMO_USD`,
    demoUsdTreasuryCapId,
    publishDigest: executed.digest,
  };
  writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        packageId,
        demoUsdTreasuryCapId,
        publisher: sender,
        digest: executed.digest,
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
