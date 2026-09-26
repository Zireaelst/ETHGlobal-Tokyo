import { afterEach, describe, expect, it, vi } from "vitest";
import { createInvoiceExtractor } from "./invoice-extractor";

afterEach(() => vi.restoreAllMocks());

describe("Ollama invoice extractor", () => {
  it("requests strict structured output and validates the result", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                vendorCandidate: "Tokyo Cloud Ltd.",
                invoiceNumber: "INV-001",
                amount: 80,
                currency: "DEMO_USD",
                dueAtMs: 1_800_000_000_000,
                confidence: 0.99,
                anomalies: [],
              }),
            },
          },
        ],
      }),
    );
    const extractor = createInvoiceExtractor({
      mode: "ollama",
      baseUrl: "http://localhost:11434/v1",
      model: "qwen2.5:0.5b",
    });

    await expect(extractor.extract(new TextEncoder().encode("invoice"))).resolves.toMatchObject({
      invoiceNumber: "INV-001",
      amount: 80,
      anomalies: [],
    });
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as {
      response_format: { type: string; json_schema: { strict: boolean } };
    };
    expect(request.response_format).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true },
    });
  });
});
