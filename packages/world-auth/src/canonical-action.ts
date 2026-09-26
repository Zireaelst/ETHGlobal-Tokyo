import { createHash } from "node:crypto";
import {
  actionAuthorizationPayloadSchema,
  type ActionAuthorizationPayload,
} from "@coffer/shared-types";

export function canonicalActionDigest(
  input: ActionAuthorizationPayload,
): Uint8Array {
  const payload = actionAuthorizationPayloadSchema.parse(input);
  const canonical = JSON.stringify({
    amount: payload.amount,
    expiresAtMs: payload.expiresAtMs,
    nonce: payload.nonce,
    paymentRequestId: payload.paymentRequestId,
    treasuryId: payload.treasuryId,
    vendor: payload.vendor,
  });
  return new Uint8Array(createHash("sha256").update(canonical).digest());
}

export function canonicalActionDigestHex(
  payload: ActionAuthorizationPayload,
): string {
  return Buffer.from(canonicalActionDigest(payload)).toString("hex");
}
