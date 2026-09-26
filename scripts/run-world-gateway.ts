import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExecuteFreshWorldAuthorization } from "@coffer/sui-client";
import {
  createWorldAuthorizationGateway,
  InMemoryAuthorizationStore,
} from "@coffer/world-auth";
import {
  createTestnetClient,
  executeAndWait,
  loadDeploymentSigner,
} from "./sui-runtime";

process.loadEnvFile();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const port = Number(process.env.PORT ?? "3000");
const deployment = JSON.parse(
  readFileSync(resolve(process.cwd(), "deployments/testnet.json"), "utf8"),
) as Record<string, string>;
const suiClient = createTestnetClient();
const suiSigner = loadDeploymentSigner();
const gateway = createWorldAuthorizationGateway({
  config: {
    issuer: requireEnv("WORLD_OIDC_ISSUER"),
    clientId: requireEnv("WORLD_OIDC_CLIENT_ID"),
    clientSecret: requireEnv("WORLD_OIDC_CLIENT_SECRET"),
    redirectUri: requireEnv("WORLD_OIDC_REDIRECT_URI"),
    maxAgeSeconds: Number(requireEnv("WORLD_OIDC_MAX_AGE_SECONDS")),
  },
  store: new InMemoryAuthorizationStore(),
  async onVerified(authorization, action) {
    if (action.treasuryId !== deployment.treasuryId) {
      throw new Error("World-authorized action belongs to another treasury");
    }
    const transaction = buildExecuteFreshWorldAuthorization({
      packageId: deployment.packageId!,
      coinType: deployment.coinType!,
      verifierCapId: deployment.worldVerifierCapId!,
      treasuryId: action.treasuryId,
      requestId: action.paymentRequestId,
      vendor: action.vendor,
      actionDigest: Uint8Array.from(Buffer.from(authorization.actionDigest, "hex")),
      maxAmount: BigInt(action.amount),
      expiresAtMs: BigInt(action.expiresAtMs),
      nonce: new TextEncoder().encode(action.nonce),
    });
    const execution = await executeAndWait(suiClient, suiSigner, transaction);
    const redactedSubject = `${authorization.subject.slice(0, 6)}…${authorization.subject.slice(-4)}`;
    console.log(
      JSON.stringify({
        event: "world_authorization_verified",
        issuer: authorization.issuer,
        subject: redactedSubject,
        actionDigest: authorization.actionDigest,
        paymentRequestId: action.paymentRequestId,
        transactionDigest: execution.digest,
      }),
    );
    return {
      authorization: "verified_and_executed",
      actionDigest: authorization.actionDigest,
      actionNonce: authorization.actionNonce,
      transactionDigest: execution.digest,
      explorerUrl: `https://suiscan.xyz/testnet/tx/${execution.digest}`,
    };
  },
});

const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const method = incoming.method ?? "GET";
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const request = new Request(
      new URL(incoming.url ?? "/", `http://${incoming.headers.host ?? `localhost:${port}`}`),
      {
        method,
        headers: incoming.headers as HeadersInit,
        ...(method !== "GET" && method !== "HEAD" && body ? { body } : {}),
      },
    );
    const response = await gateway.handle(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    outgoing.writeHead(500, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ status: "failed" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Coffer World gateway listening on http://localhost:${port}`);
});
