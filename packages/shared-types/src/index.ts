import { z } from "zod";

export const bucketNameSchema = z.enum([
  "OPERATING",
  "RESERVE",
  "VENDOR_COMMITTED",
]);

export const agentDecisionSchema = z.enum([
  "AUTO_EXECUTE",
  "HUMAN_AUTH_REQUIRED",
  "HOLD",
  "REJECT",
]);

export const paymentStatusSchema = z.enum([
  "PENDING",
  "AUTO_APPROVED",
  "AUTHORIZATION_REQUIRED",
  "HELD",
  "REJECTED",
  "PAID",
  "EXPIRED",
]);

export const invoiceExtractionSchema = z.object({
  vendorCandidate: z.string().min(1),
  invoiceNumber: z.string().min(1),
  amount: z.number().positive(),
  currency: z.literal("DEMO_USD"),
  dueAtMs: z.number().int().nonnegative(),
  purchaseOrder: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1),
  anomalies: z.array(z.string()),
});

export const policyResultSchema = z
  .object({
    decision: agentDecisionSchema,
    reasonCodes: z.array(z.string()),
    selectedBucket: bucketNameSchema.nullable(),
    policyVersion: z.number().int().positive(),
  })
  .superRefine((value, context) => {
    if (value.decision !== "AUTO_EXECUTE" && value.reasonCodes.length === 0) {
      context.addIssue({
        code: "custom",
        message: "A non-executing decision needs a reason code",
        path: ["reasonCodes"],
      });
    }
  });

export const actionAuthorizationPayloadSchema = z.object({
  treasuryId: z.string().min(1),
  paymentRequestId: z.string().min(1),
  vendor: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  expiresAtMs: z.number().int().positive(),
  nonce: z.string().min(16),
});

export type BucketName = z.infer<typeof bucketNameSchema>;
export type AgentDecision = z.infer<typeof agentDecisionSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
export type PolicyResult = z.infer<typeof policyResultSchema>;
export type ActionAuthorizationPayload = z.infer<
  typeof actionAuthorizationPayloadSchema
>;
