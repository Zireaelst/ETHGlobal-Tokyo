import { bcs } from "@mysten/sui/bcs";
import type { ClientWithCoreApi } from "@mysten/sui/client";

const UID = bcs.struct("UID", { id: bcs.Address });
const Balance = bcs.struct("Balance", { value: bcs.u64() });

const Treasury = bcs.struct("Treasury", {
  id: UID,
  organization: bcs.string(),
  operating: Balance,
  reserve: Balance,
  vendor_committed: Balance,
  paused: bcs.bool(),
  policy_version: bcs.u64(),
  total_paid: bcs.u64(),
});

const PaymentRequest = bcs.struct("PaymentRequest", {
  id: UID,
  treasury_id: bcs.Address,
  requester: bcs.Address,
  vendor: bcs.Address,
  amount: bcs.u64(),
  bucket: bcs.u8(),
  due_at_ms: bcs.u64(),
  expires_at_ms: bcs.u64(),
  policy_version: bcs.u64(),
  invoice_digest: bcs.vector(bcs.u8()),
  walrus_blob_id: bcs.string(),
  seal_policy_id: bcs.Address,
  action_digest: bcs.vector(bcs.u8()),
  status: bcs.u8(),
});

export type TreasurySnapshot = {
  id: string;
  organization: string;
  operating: bigint;
  reserve: bigint;
  vendorCommitted: bigint;
  paused: boolean;
  policyVersion: bigint;
  totalPaid: bigint;
};

export type PaymentRequestSnapshot = {
  id: string;
  treasuryId: string;
  requester: string;
  vendor: string;
  amount: bigint;
  bucket: number;
  dueAtMs: bigint;
  expiresAtMs: bigint;
  policyVersion: bigint;
  documentRef: {
    blobId: string;
    plaintextDigest: string;
    sealPolicyId: string;
  };
  actionDigest: Uint8Array;
  status: number;
};

export async function readTreasurySnapshot(
  client: ClientWithCoreApi,
  objectId: string,
): Promise<TreasurySnapshot> {
  const { object } = await client.core.getObject({
    objectId,
    include: { content: true },
  });
  const parsed = Treasury.parse(object.content);
  return {
    id: object.objectId,
    organization: parsed.organization,
    operating: BigInt(parsed.operating.value),
    reserve: BigInt(parsed.reserve.value),
    vendorCommitted: BigInt(parsed.vendor_committed.value),
    paused: parsed.paused,
    policyVersion: BigInt(parsed.policy_version),
    totalPaid: BigInt(parsed.total_paid),
  };
}

export async function readPaymentRequest(
  client: ClientWithCoreApi,
  objectId: string,
): Promise<PaymentRequestSnapshot> {
  const { object } = await client.core.getObject({
    objectId,
    include: { content: true },
  });
  const parsed = PaymentRequest.parse(object.content);
  return {
    id: object.objectId,
    treasuryId: parsed.treasury_id,
    requester: parsed.requester,
    vendor: parsed.vendor,
    amount: BigInt(parsed.amount),
    bucket: parsed.bucket,
    dueAtMs: BigInt(parsed.due_at_ms),
    expiresAtMs: BigInt(parsed.expires_at_ms),
    policyVersion: BigInt(parsed.policy_version),
    documentRef: {
      blobId: parsed.walrus_blob_id,
      plaintextDigest: Buffer.from(parsed.invoice_digest).toString("hex"),
      sealPolicyId: parsed.seal_policy_id,
    },
    actionDigest: new Uint8Array(parsed.action_digest),
    status: parsed.status,
  };
}
