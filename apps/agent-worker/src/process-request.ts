import {
  AccessDeniedError,
  IntegrityError,
  PrivacyUnavailableError,
  type DocumentPrivacy,
  type EncryptedDocumentRef,
} from "@coffer/document-privacy";
import { evaluatePayment } from "@coffer/policy-engine";
import type {
  BucketName,
  InvoiceExtraction,
  PolicyResult,
} from "@coffer/shared-types";
import type { JobStore } from "./job-store";
import type { InvoiceExtractor } from "./invoice-extractor";

export type WorkerPaymentRequest = {
  id: string;
  treasuryId: string;
  vendor: string;
  amount: bigint;
  bucket: BucketName;
  dueAtMs: number;
  expiresAtMs: number;
  policyVersion: number;
  documentRef: EncryptedDocumentRef;
};

export type PaymentPolicyContext = {
  treasuryActive: boolean;
  mandateActive: boolean;
  treasuryPolicyVersion: number;
  vendorApproved: boolean;
  perPaymentLimit: bigint;
  periodSpent: bigint;
  periodLimit: bigint;
  bucketBalance: bigint;
  minimumExtractionConfidence: number;
};

export interface PaymentWorkerSui {
  readPaymentRequest(requestId: string): Promise<WorkerPaymentRequest>;
  readPolicyContext(request: WorkerPaymentRequest): Promise<PaymentPolicyContext>;
  executeWithinMandate(request: WorkerPaymentRequest): Promise<string>;
  requestHumanAuthorization(
    request: WorkerPaymentRequest,
    result: PolicyResult,
  ): Promise<void>;
  recordDecision(
    request: WorkerPaymentRequest,
    result: PolicyResult,
    transactionDigest: string | undefined,
  ): Promise<void>;
}

export type PaymentWorkerDependencies = {
  jobs: JobStore;
  now: () => number;
  privacy: DocumentPrivacy;
  extractor: InvoiceExtractor;
  sui: PaymentWorkerSui;
};

function privacyFailure(error: unknown, policyVersion: number): PolicyResult {
  const reasonCode =
    error instanceof AccessDeniedError
      ? "DOCUMENT_ACCESS_DENIED"
      : error instanceof IntegrityError
        ? "DOCUMENT_INTEGRITY_FAILURE"
        : "DOCUMENT_PRIVACY_UNAVAILABLE";
  return {
    decision: "HOLD",
    reasonCodes: [reasonCode],
    selectedBucket: null,
    policyVersion,
  };
}

function extractionMatchesRequest(
  extraction: InvoiceExtraction,
  request: WorkerPaymentRequest,
): boolean {
  const amountInBaseUnits = Math.round(extraction.amount * 1_000_000);
  return (
    Number.isSafeInteger(amountInBaseUnits) &&
    BigInt(amountInBaseUnits) === request.amount &&
    extraction.dueAtMs === request.dueAtMs
  );
}

async function applyDecision(
  request: WorkerPaymentRequest,
  result: PolicyResult,
  deps: PaymentWorkerDependencies,
) {
  let transactionDigest: string | undefined;
  if (result.decision === "AUTO_EXECUTE") {
    transactionDigest = await deps.sui.executeWithinMandate(request);
  } else if (result.decision === "HUMAN_AUTH_REQUIRED") {
    await deps.sui.requestHumanAuthorization(request, result);
  }
  await deps.sui.recordDecision(request, result, transactionDigest);
}

export async function processPaymentRequest(
  requestId: string,
  deps: PaymentWorkerDependencies,
): Promise<PolicyResult> {
  return deps.jobs.once(`payment:${requestId}`, async () => {
    const request = await deps.sui.readPaymentRequest(requestId);
    let document: Uint8Array;
    try {
      document = await deps.privacy.get(request.documentRef);
    } catch (error) {
      if (
        !(
          error instanceof PrivacyUnavailableError ||
          error instanceof AccessDeniedError ||
          error instanceof IntegrityError
        )
      ) {
        throw error;
      }
      const result = privacyFailure(error, request.policyVersion);
      await deps.sui.recordDecision(request, result, undefined);
      return result;
    }

    let extraction: InvoiceExtraction;
    try {
      extraction = await deps.extractor.extract(document);
    } catch {
      const result: PolicyResult = {
        decision: "HOLD",
        reasonCodes: ["INVALID_EXTRACTION"],
        selectedBucket: null,
        policyVersion: request.policyVersion,
      };
      await deps.sui.recordDecision(request, result, undefined);
      return result;
    }
    const context = await deps.sui.readPolicyContext(request);
    const result = evaluatePayment({
      extractionValid: extractionMatchesRequest(extraction, request),
      extractionConfidence: extraction.confidence,
      minimumExtractionConfidence: context.minimumExtractionConfidence,
      treasuryActive: context.treasuryActive,
      mandateActive: context.mandateActive,
      requestExpiresAtMs: request.expiresAtMs,
      nowMs: deps.now(),
      requestPolicyVersion: request.policyVersion,
      treasuryPolicyVersion: context.treasuryPolicyVersion,
      vendorApproved: context.vendorApproved,
      amount: request.amount,
      perPaymentLimit: context.perPaymentLimit,
      periodSpent: context.periodSpent,
      periodLimit: context.periodLimit,
      bucketBalance: context.bucketBalance,
      dueAtMs: request.dueAtMs,
      selectedBucket: request.bucket,
    });
    await applyDecision(request, result, deps);
    return result;
  });
}
