import { describe, expect, it } from "vitest";
import { evaluatePayment, type PaymentPolicyInput } from "./evaluate-payment";

const baseInput: PaymentPolicyInput = {
  extractionValid: true,
  extractionConfidence: 0.98,
  minimumExtractionConfidence: 0.7,
  treasuryActive: true,
  mandateActive: true,
  requestExpiresAtMs: 5_000,
  nowMs: 1_000,
  requestPolicyVersion: 3,
  treasuryPolicyVersion: 3,
  vendorApproved: true,
  amount: 80n,
  humanApprovalThreshold: 90n,
  perPaymentLimit: 100n,
  periodSpent: 200n,
  periodLimit: 500n,
  bucketBalance: 1_000n,
  dueAtMs: 1_000,
  selectedBucket: "VENDOR_COMMITTED",
};

describe("evaluatePayment", () => {
  it.each([
    ["approved request", baseInput, "AUTO_EXECUTE", []],
    [
      "unknown vendor",
      { ...baseInput, vendorApproved: false },
      "HUMAN_AUTH_REQUIRED",
      ["VENDOR_NOT_ALLOWED"],
    ],
    [
      "human approval threshold",
      { ...baseInput, amount: 91n },
      "HUMAN_AUTH_REQUIRED",
      ["HUMAN_APPROVAL_THRESHOLD_EXCEEDED"],
    ],
    [
      "single limit",
      { ...baseInput, amount: 101n, humanApprovalThreshold: 200n },
      "HUMAN_AUTH_REQUIRED",
      ["PER_PAYMENT_LIMIT_EXCEEDED"],
    ],
    [
      "low confidence",
      { ...baseInput, extractionConfidence: 0.69 },
      "HOLD",
      ["LOW_EXTRACTION_CONFIDENCE"],
    ],
    [
      "expired mandate",
      { ...baseInput, mandateActive: false },
      "REJECT",
      ["MANDATE_INACTIVE"],
    ],
  ] as const)("evaluates %s", (_name, input, decision, reasonCodes) => {
    expect(evaluatePayment(input)).toMatchObject({ decision, reasonCodes });
  });

  it("applies fail-closed rules in deterministic order", () => {
    expect(
      evaluatePayment({
        ...baseInput,
        extractionValid: false,
        treasuryActive: false,
        vendorApproved: false,
      }),
    ).toMatchObject({ decision: "HOLD", reasonCodes: ["INVALID_EXTRACTION"] });
  });

  it.each([
    [
      "inactive treasury",
      { treasuryActive: false },
      "REJECT",
      "TREASURY_INACTIVE",
    ],
    [
      "expired request",
      { requestExpiresAtMs: 999 },
      "REJECT",
      "REQUEST_EXPIRED",
    ],
    [
      "stale policy",
      { requestPolicyVersion: 2 },
      "HOLD",
      "POLICY_VERSION_MISMATCH",
    ],
    [
      "period limit",
      { periodSpent: 450n },
      "HUMAN_AUTH_REQUIRED",
      "PERIOD_LIMIT_EXCEEDED",
    ],
    [
      "insufficient bucket",
      { bucketBalance: 79n },
      "HOLD",
      "INSUFFICIENT_BUCKET_BALANCE",
    ],
    ["not due", { dueAtMs: 1_001 }, "HOLD", "PAYMENT_NOT_DUE"],
  ] as const)("handles %s", (_name, patch, decision, reasonCode) => {
    expect(evaluatePayment({ ...baseInput, ...patch })).toMatchObject({
      decision,
      reasonCodes: [reasonCode],
    });
  });
});
