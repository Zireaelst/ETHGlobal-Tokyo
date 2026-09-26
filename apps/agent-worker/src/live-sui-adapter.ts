import type { ActionAuthorizationPayload, BucketName, PolicyResult } from "@coffer/shared-types";
import {
  buildExecuteWithinMandate,
  readAgentMandate,
  readPaymentRequest,
  readTreasurySnapshot,
  readVendorPolicy,
  type AgentMandateSnapshot,
  type PaymentRequestSnapshot,
  type TreasurySnapshot,
  type VendorPolicySnapshot,
} from "@coffer/sui-client";
import { canonicalActionDigest } from "@coffer/world-auth";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import type { Transaction } from "@mysten/sui/transactions";
import type {
  PaymentPolicyContext,
  PaymentWorkerSui,
  WorkerPaymentRequest,
} from "./process-request";

const BUCKETS: Record<number, BucketName> = {
  0: "OPERATING",
  1: "RESERVE",
  2: "VENDOR_COMMITTED",
};

export type LiveSuiDeployment = {
  packageId: string;
  coinType: string;
  treasuryId: string;
  mandateId: string;
  agentCapId: string;
  vendorPolicyId: string;
};

type Reads = {
  payment(client: ClientWithCoreApi, id: string): Promise<PaymentRequestSnapshot>;
  treasury(client: ClientWithCoreApi, id: string): Promise<TreasurySnapshot>;
  mandate(client: ClientWithCoreApi, id: string): Promise<AgentMandateSnapshot>;
  vendor(client: ClientWithCoreApi, id: string): Promise<VendorPolicySnapshot>;
};

export type WorkerAuditRecord = {
  atMs: number;
  requestId: string;
  decision: PolicyResult["decision"];
  reasonCodes: string[];
  transactionDigest?: string;
  authorizationUrl?: string;
};

export type LiveSuiAdapterOptions = {
  client: ClientWithCoreApi;
  deployment: LiveSuiDeployment;
  agentAddress: string;
  execute(transaction: Transaction): Promise<string>;
  worldGatewayUrl: string;
  resolveAuthorizationAction(
    request: WorkerPaymentRequest,
  ): ActionAuthorizationPayload | undefined;
  now?: () => number;
  minimumExtractionConfidence?: number;
  fetch?: typeof fetch;
  audit?(record: WorkerAuditRecord): Promise<void> | void;
  reads?: Reads;
};

function bucketName(value: number): BucketName {
  const bucket = BUCKETS[value];
  if (!bucket) throw new Error(`Unknown Sui treasury bucket: ${value}`);
  return bucket;
}

function bucketCode(value: BucketName): number {
  if (value === "OPERATING") return 0;
  if (value === "RESERVE") return 1;
  return 2;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return Buffer.from(left).equals(Buffer.from(right));
}

export function createLiveSuiAdapter(
  options: LiveSuiAdapterOptions,
): PaymentWorkerSui {
  const now = options.now ?? Date.now;
  const fetcher = options.fetch ?? fetch;
  const reads = options.reads ?? {
    payment: readPaymentRequest,
    treasury: readTreasurySnapshot,
    mandate: readAgentMandate,
    vendor: readVendorPolicy,
  };
  const pendingAuthorizationUrls = new Map<string, string>();

  return {
    async readPaymentRequest(requestId) {
      const snapshot = await reads.payment(options.client, requestId);
      if (snapshot.status !== 0) {
        throw new Error(`Payment request is not pending (status ${snapshot.status})`);
      }
      return {
        id: snapshot.id,
        treasuryId: snapshot.treasuryId,
        vendor: snapshot.vendor,
        amount: snapshot.amount,
        bucket: bucketName(snapshot.bucket),
        dueAtMs: Number(snapshot.dueAtMs),
        expiresAtMs: Number(snapshot.expiresAtMs),
        policyVersion: Number(snapshot.policyVersion),
        documentRef: snapshot.documentRef,
        actionDigest: snapshot.actionDigest,
      };
    },

    async readPolicyContext(request): Promise<PaymentPolicyContext> {
      const [treasury, mandate, vendor] = await Promise.all([
        reads.treasury(options.client, options.deployment.treasuryId),
        reads.mandate(options.client, options.deployment.mandateId),
        reads.vendor(options.client, options.deployment.vendorPolicyId),
      ]);
      const at = BigInt(now());
      const bucketBalance =
        request.bucket === "OPERATING"
          ? treasury.operating
          : request.bucket === "RESERVE"
            ? treasury.reserve
            : treasury.vendorCommitted;
      const periodExpired =
        at >= mandate.periodStartedAtMs + mandate.periodDurationMs;
      const mandateActive =
        !mandate.revoked &&
        mandate.treasuryId === request.treasuryId &&
        mandate.agent === options.agentAddress &&
        mandate.policyVersion === BigInt(request.policyVersion) &&
        at >= mandate.validFromMs &&
        at <= mandate.validUntilMs;
      const vendorApproved =
        vendor.active &&
        vendor.treasuryId === request.treasuryId &&
        vendor.vendor === request.vendor &&
        vendor.allowedBucket === bucketCode(request.bucket) &&
        request.amount <= vendor.maxPayment &&
        at <= vendor.validUntilMs;

      return {
        treasuryActive: !treasury.paused && treasury.id === request.treasuryId,
        mandateActive,
        treasuryPolicyVersion: Number(treasury.policyVersion),
        vendorApproved,
        humanApprovalThreshold: mandate.approvalThreshold,
        perPaymentLimit: mandate.maxPerPayment,
        periodSpent: periodExpired ? 0n : mandate.periodSpent,
        periodLimit: mandate.periodLimit,
        bucketBalance,
        minimumExtractionConfidence: options.minimumExtractionConfidence ?? 0.85,
      };
    },

    async executeWithinMandate(request) {
      return options.execute(
        buildExecuteWithinMandate({
          packageId: options.deployment.packageId,
          coinType: options.deployment.coinType,
          agentCap: options.deployment.agentCapId,
          mandate: options.deployment.mandateId,
          vendorPolicy: options.deployment.vendorPolicyId,
          treasury: options.deployment.treasuryId,
          request: request.id,
        }),
      );
    },

    async requestHumanAuthorization(request) {
      const action = options.resolveAuthorizationAction(request);
      if (!action) {
        throw new Error(`No exact World authorization action is registered for ${request.id}`);
      }
      if (
        action.treasuryId !== request.treasuryId ||
        action.paymentRequestId !== request.id ||
        action.vendor !== request.vendor ||
        action.amount !== request.amount.toString() ||
        action.expiresAtMs !== request.expiresAtMs ||
        !sameBytes(canonicalActionDigest(action), request.actionDigest)
      ) {
        throw new Error("World authorization action does not match the onchain commitment");
      }
      const response = await fetcher(
        `${options.worldGatewayUrl.replace(/\/$/, "")}/api/world/authorize`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(action),
        },
      );
      if (!response.ok) {
        throw new Error(`World gateway returned HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { authorizationUrl?: string };
      if (!payload.authorizationUrl) {
        throw new Error("World gateway did not return an authorization URL");
      }
      pendingAuthorizationUrls.set(request.id, payload.authorizationUrl);
    },

    async recordDecision(request, result, transactionDigest) {
      const authorizationUrl = pendingAuthorizationUrls.get(request.id);
      await options.audit?.({
        atMs: now(),
        requestId: request.id,
        decision: result.decision,
        reasonCodes: [...result.reasonCodes],
        ...(transactionDigest ? { transactionDigest } : {}),
        ...(authorizationUrl ? { authorizationUrl } : {}),
      });
      pendingAuthorizationUrls.delete(request.id);
    },
  };
}
