import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  createInvoiceExtractor,
  createLiveSuiAdapter,
  LibsqlJobStore,
  processPaymentRequest,
  type WorkerAuditRecord,
} from "@coffer/agent-worker";
import {
  buildAgentDocumentApproval,
  SealWalrusDocumentPrivacy,
} from "@coffer/document-privacy";
import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import { SealClient, SessionKey } from "@mysten/seal";
import { walrus } from "@mysten/walrus";
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

type Deployment = {
  packageId: string;
  coinType: string;
  treasuryId: string;
  mandateId: string;
  agentCapId: string;
  vendorPolicyId: string;
  agentDemo?: { action?: ActionAuthorizationPayload };
  worldDemo?: { action?: ActionAuthorizationPayload };
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function extractorFromEnvironment() {
  const mode = process.env.INVOICE_EXTRACTOR_MODE ?? "ollama";
  if (mode === "ollama") {
    return createInvoiceExtractor({
      mode,
      baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      model: required("OLLAMA_MODEL"),
    });
  }
  if (mode === "anthropic") {
    return createInvoiceExtractor({
      mode,
      apiKey: required("ANTHROPIC_API_KEY"),
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
    });
  }
  throw new Error("INVOICE_EXTRACTOR_MODE must be ollama or anthropic in live runs");
}

async function main() {
  const requestId = process.argv[2];
  if (!requestId) {
    throw new Error("Usage: pnpm agent:once <Sui payment request object ID>");
  }
  const deployment = JSON.parse(
    await readFile(resolve("deployments/testnet.json"), "utf8"),
  ) as Deployment;
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
    packageId: deployment.packageId,
    ttlMin: 10,
    signer,
    suiClient: client,
  });
  const privacy = new SealWalrusDocumentPrivacy({
    packageId: deployment.packageId,
    policyId: deployment.treasuryId,
    threshold: 2,
    seal,
    walrus: client.walrus,
    signer,
    sessionKey,
    buildApprovalTransaction: (ref) =>
      buildAgentDocumentApproval({
        client,
        packageId: deployment.packageId,
        coinType: deployment.coinType,
        treasuryId: deployment.treasuryId,
        mandateId: deployment.mandateId,
        agentCapId: deployment.agentCapId,
        sender: signer.toSuiAddress(),
        ref,
      }),
  });
  const auditPath = resolve(process.env.COFFER_AUDIT_PATH ?? "runtime/coffer-audit.jsonl");
  const audit = async (record: WorkerAuditRecord) => {
    await mkdir(dirname(auditPath), { recursive: true });
    await appendFile(auditPath, `${JSON.stringify(record)}\n`);
    console.log(JSON.stringify({ event: "agent_decision", ...record }, null, 2));
  };
  const actions = [deployment.agentDemo?.action, deployment.worldDemo?.action].filter(
    (value): value is ActionAuthorizationPayload => Boolean(value),
  );
  const sui = createLiveSuiAdapter({
    client,
    deployment,
    agentAddress: signer.toSuiAddress(),
    execute: async (transaction) =>
      (await executeAndWait(baseClient, signer, transaction)).digest,
    worldGatewayUrl: required("WORLD_GATEWAY_URL"),
    resolveAuthorizationAction: (request) =>
      actions.find((action) => action.paymentRequestId === request.id),
    audit,
  });
  const jobs = new LibsqlJobStore();
  try {
    const result = await processPaymentRequest(requestId, {
      jobs,
      now: Date.now,
      privacy,
      extractor: extractorFromEnvironment(),
      sui,
    });
    console.log(JSON.stringify({ requestId, result }, null, 2));
  } finally {
    jobs.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
