import {
  invoiceExtractionSchema,
  type InvoiceExtraction,
} from "@coffer/shared-types";
import { z } from "zod";

export interface InvoiceExtractor {
  extract(document: Uint8Array): Promise<InvoiceExtraction>;
}

const extractorConfigSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("fixture") }),
  z.object({
    mode: z.literal("ollama"),
    baseUrl: z.url(),
    model: z.string().min(1),
  }),
  z.object({
    mode: z.literal("anthropic"),
    apiKey: z.string().min(1),
    model: z.string().min(1),
  }),
]);

export type InvoiceExtractorConfig = z.infer<typeof extractorConfigSchema>;

function documentPrompt(document: Uint8Array) {
  return [
    "Extract this invoice as strict JSON with vendorCandidate, invoiceNumber, amount, currency=DEMO_USD, dueAtMs, optional purchaseOrder, confidence, anomalies.",
    "Amounts use whole DEMO_USD units. Do not invent missing data; lower confidence and add an anomaly.",
    new TextDecoder().decode(document),
  ].join("\n\n");
}

function parseModelJson(value: string): InvoiceExtraction {
  const normalized = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return invoiceExtractionSchema.parse(JSON.parse(normalized));
}

class FixtureInvoiceExtractor implements InvoiceExtractor {
  async extract(document: Uint8Array): Promise<InvoiceExtraction> {
    return invoiceExtractionSchema.parse(
      JSON.parse(new TextDecoder().decode(document)),
    );
  }
}

class OllamaInvoiceExtractor implements InvoiceExtractor {
  constructor(
    readonly baseUrl: string,
    readonly model: string,
  ) {}

  async extract(document: Uint8Array): Promise<InvoiceExtraction> {
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: documentPrompt(document) }],
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Ollama extraction failed with HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Ollama returned no invoice extraction");
    return parseModelJson(content);
  }
}

class AnthropicInvoiceExtractor implements InvoiceExtractor {
  constructor(
    readonly apiKey: string,
    readonly model: string,
  ) {}

  async extract(document: Uint8Array): Promise<InvoiceExtraction> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1_024,
        temperature: 0,
        messages: [{ role: "user", content: documentPrompt(document) }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Anthropic extraction failed with HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = payload.content?.find((item) => item.type === "text")?.text;
    if (!content) throw new Error("Anthropic returned no invoice extraction");
    return parseModelJson(content);
  }
}

export function createInvoiceExtractor(
  input: InvoiceExtractorConfig,
): InvoiceExtractor {
  const config = extractorConfigSchema.parse(input);
  if (config.mode === "fixture") {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Fixture invoice extraction is allowed only in tests");
    }
    return new FixtureInvoiceExtractor();
  }
  if (config.mode === "ollama") {
    return new OllamaInvoiceExtractor(config.baseUrl, config.model);
  }
  return new AnthropicInvoiceExtractor(config.apiKey, config.model);
}
