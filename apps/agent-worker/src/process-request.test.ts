import { describe, expect, it, vi } from "vitest";
import type { InvoiceExtraction } from "@coffer/shared-types";
import { PrivacyUnavailableError } from "@coffer/document-privacy";
import { MemoryJobStore } from "./job-store";
import {
  processPaymentRequest,
  type PaymentWorkerDependencies,
  type WorkerPaymentRequest,
} from "./process-request";

const request: WorkerPaymentRequest = {
  id: "request-1",
  treasuryId: "treasury-1",
  vendor: "0xvendor",
  amount: 80_000_000n,
  bucket: "VENDOR_COMMITTED",
  dueAtMs: 1_000,
  expiresAtMs: 10_000,
  policyVersion: 1,
  documentRef: {
    blobId: "walrus-1",
    plaintextDigest: "ab".repeat(32),
    sealPolicyId: "treasury-1",
  },
};

const extraction: InvoiceExtraction = {
  vendorCandidate: "Tokyo Supplies",
  invoiceNumber: "INV-2026-09",
  amount: 80,
  currency: "DEMO_USD",
  dueAtMs: 1_000,
  confidence: 0.98,
  anomalies: [],
};

function dependencies(
  overrides: Partial<PaymentWorkerDependencies> = {},
): PaymentWorkerDependencies {
  return {
    jobs: new MemoryJobStore(),
    now: () => 2_000,
    privacy: { put: vi.fn(), get: vi.fn().mockResolvedValue(new Uint8Array([1])) },
    extractor: { extract: vi.fn().mockResolvedValue(extraction) },
    sui: {
      readPaymentRequest: vi.fn().mockResolvedValue(request),
      readPolicyContext: vi.fn().mockResolvedValue({
        treasuryActive: true,
        mandateActive: true,
        treasuryPolicyVersion: 1,
        vendorApproved: true,
        perPaymentLimit: 500_000_000n,
        periodSpent: 0n,
        periodLimit: 2_000_000_000n,
        bucketBalance: 1_000_000_000n,
        minimumExtractionConfidence: 0.85,
      }),
      executeWithinMandate: vi.fn().mockResolvedValue("digest-1"),
      requestHumanAuthorization: vi.fn().mockResolvedValue(undefined),
      recordDecision: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

describe("processPaymentRequest", () => {
  it("executes a valid request within the onchain mandate", async () => {
    const deps = dependencies();
    const result = await processPaymentRequest(request.id, deps);

    expect(result.decision).toBe("AUTO_EXECUTE");
    expect(deps.sui.executeWithinMandate).toHaveBeenCalledWith(request);
    expect(deps.sui.recordDecision).toHaveBeenCalledWith(request, result, "digest-1");
  });

  it("requests fresh human authorization when policy requires escalation", async () => {
    const deps = dependencies();
    vi.mocked(deps.sui.readPolicyContext).mockResolvedValue({
      ...(await deps.sui.readPolicyContext(request)),
      vendorApproved: false,
    });

    const result = await processPaymentRequest(request.id, deps);
    expect(result).toMatchObject({
      decision: "HUMAN_AUTH_REQUIRED",
      reasonCodes: ["VENDOR_NOT_ALLOWED"],
    });
    expect(deps.sui.requestHumanAuthorization).toHaveBeenCalledWith(request, result);
    expect(deps.sui.executeWithinMandate).not.toHaveBeenCalled();
  });

  it("fails closed when the encrypted invoice cannot be decrypted", async () => {
    const deps = dependencies({
      privacy: {
        put: vi.fn(),
        get: vi.fn().mockRejectedValue(new PrivacyUnavailableError("Walrus unavailable")),
      },
    });

    const result = await processPaymentRequest(request.id, deps);
    expect(result).toMatchObject({
      decision: "HOLD",
      reasonCodes: ["DOCUMENT_PRIVACY_UNAVAILABLE"],
    });
    expect(deps.extractor.extract).not.toHaveBeenCalled();
    expect(deps.sui.executeWithinMandate).not.toHaveBeenCalled();
  });

  it("holds a low-confidence extraction", async () => {
    const deps = dependencies({
      extractor: {
        extract: vi.fn().mockResolvedValue({ ...extraction, confidence: 0.4 }),
      },
    });

    const result = await processPaymentRequest(request.id, deps);
    expect(result).toMatchObject({
      decision: "HOLD",
      reasonCodes: ["LOW_EXTRACTION_CONFIDENCE"],
    });
  });

  it("holds an invoice that the extractor cannot parse", async () => {
    const deps = dependencies({
      extractor: {
        extract: vi.fn().mockRejectedValue(new Error("invalid invoice JSON")),
      },
    });

    const result = await processPaymentRequest(request.id, deps);
    expect(result).toMatchObject({
      decision: "HOLD",
      reasonCodes: ["INVALID_EXTRACTION"],
    });
    expect(deps.sui.executeWithinMandate).not.toHaveBeenCalled();
  });

  it("rejects execution when the delegated mandate is inactive", async () => {
    const deps = dependencies();
    vi.mocked(deps.sui.readPolicyContext).mockResolvedValue({
      ...(await deps.sui.readPolicyContext(request)),
      mandateActive: false,
    });

    const result = await processPaymentRequest(request.id, deps);
    expect(result).toMatchObject({
      decision: "REJECT",
      reasonCodes: ["MANDATE_INACTIVE"],
    });
    expect(deps.sui.executeWithinMandate).not.toHaveBeenCalled();
  });

  it("submits exactly one transaction for duplicate concurrent delivery", async () => {
    const deps = dependencies();
    const [first, second] = await Promise.all([
      processPaymentRequest(request.id, deps),
      processPaymentRequest(request.id, deps),
    ]);

    expect(first).toEqual(second);
    expect(deps.sui.executeWithinMandate).toHaveBeenCalledTimes(1);
  });
});
