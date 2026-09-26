import type {
  AgentDecision,
  BucketName,
  PolicyResult,
} from "@coffer/shared-types";

export type PaymentPolicyInput = {
  extractionValid: boolean;
  extractionConfidence: number;
  minimumExtractionConfidence: number;
  treasuryActive: boolean;
  mandateActive: boolean;
  requestExpiresAtMs: number;
  nowMs: number;
  requestPolicyVersion: number;
  treasuryPolicyVersion: number;
  vendorApproved: boolean;
  amount: bigint;
  humanApprovalThreshold: bigint;
  perPaymentLimit: bigint;
  periodSpent: bigint;
  periodLimit: bigint;
  bucketBalance: bigint;
  dueAtMs: number;
  selectedBucket: BucketName;
};

function result(
  input: PaymentPolicyInput,
  decision: AgentDecision,
  reasonCodes: string[],
  includeBucket = true,
): PolicyResult {
  return {
    decision,
    reasonCodes,
    selectedBucket: includeBucket ? input.selectedBucket : null,
    policyVersion: input.treasuryPolicyVersion,
  };
}

export function evaluatePayment(input: PaymentPolicyInput): PolicyResult {
  if (!input.extractionValid) {
    return result(input, "HOLD", ["INVALID_EXTRACTION"], false);
  }
  if (input.extractionConfidence < input.minimumExtractionConfidence) {
    return result(input, "HOLD", ["LOW_EXTRACTION_CONFIDENCE"], false);
  }
  if (!input.treasuryActive) {
    return result(input, "REJECT", ["TREASURY_INACTIVE"]);
  }
  if (!input.mandateActive) {
    return result(input, "REJECT", ["MANDATE_INACTIVE"]);
  }
  if (input.nowMs > input.requestExpiresAtMs) {
    return result(input, "REJECT", ["REQUEST_EXPIRED"]);
  }
  if (input.requestPolicyVersion !== input.treasuryPolicyVersion) {
    return result(input, "HOLD", ["POLICY_VERSION_MISMATCH"]);
  }
  if (!input.vendorApproved) {
    return result(input, "HUMAN_AUTH_REQUIRED", ["VENDOR_NOT_ALLOWED"]);
  }
  if (input.amount > input.humanApprovalThreshold) {
    return result(input, "HUMAN_AUTH_REQUIRED", [
      "HUMAN_APPROVAL_THRESHOLD_EXCEEDED",
    ]);
  }
  if (input.amount > input.perPaymentLimit) {
    return result(input, "HUMAN_AUTH_REQUIRED", [
      "PER_PAYMENT_LIMIT_EXCEEDED",
    ]);
  }
  if (input.periodSpent + input.amount > input.periodLimit) {
    return result(input, "HUMAN_AUTH_REQUIRED", ["PERIOD_LIMIT_EXCEEDED"]);
  }
  if (input.bucketBalance < input.amount) {
    return result(input, "HOLD", ["INSUFFICIENT_BUCKET_BALANCE"]);
  }
  if (input.nowMs < input.dueAtMs) {
    return result(input, "HOLD", ["PAYMENT_NOT_DUE"]);
  }
  return result(input, "AUTO_EXECUTE", []);
}
