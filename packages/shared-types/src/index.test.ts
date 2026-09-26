import { describe, expect, it } from "vitest";

import { invoiceExtractionSchema, policyResultSchema } from "./index";

describe("shared schemas", () => {
  it("rejects an invoice with a non-positive amount", () => {
    expect(() =>
      invoiceExtractionSchema.parse({
        vendorCandidate: "Tokyo Cloud Ltd.",
        invoiceNumber: "INV-001",
        amount: 0,
        currency: "DEMO_USD",
        dueAtMs: 1,
        confidence: 0.99,
        anomalies: [],
      }),
    ).toThrow();
  });

  it("requires reason codes for non-executing decisions", () => {
    expect(() =>
      policyResultSchema.parse({
        decision: "REJECT",
        reasonCodes: [],
        selectedBucket: null,
        policyVersion: 1,
      }),
    ).toThrow();
  });
});
