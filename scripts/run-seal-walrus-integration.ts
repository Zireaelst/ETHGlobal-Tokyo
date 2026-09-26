import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const envPath = resolve(projectRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const deployment = JSON.parse(
  readFileSync(resolve(projectRoot, "deployments/testnet.json"), "utf8"),
) as Record<string, string>;

const result = spawnSync(
  "pnpm",
  ["--filter", "@coffer/document-privacy", "test:integration"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      COFFER_PACKAGE_ID: deployment.packageId,
      COFFER_TREASURY_ID: deployment.treasuryId,
      COFFER_MANDATE_ID: deployment.mandateId,
      COFFER_AGENT_CAP_ID: deployment.agentCapId,
      COFFER_COIN_TYPE: deployment.coinType,
    },
  },
);

process.exitCode = result.status ?? 1;
