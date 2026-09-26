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

const AgentMandate = bcs.struct("AgentMandate", {
  id: UID,
  treasury_id: bcs.Address,
  agent: bcs.Address,
  max_per_payment: bcs.u64(),
  period_limit: bcs.u64(),
  period_spent: bcs.u64(),
  period_started_at_ms: bcs.u64(),
  period_duration_ms: bcs.u64(),
  valid_from_ms: bcs.u64(),
  valid_until_ms: bcs.u64(),
  approval_threshold: bcs.u64(),
  max_rebalance: bcs.u64(),
  policy_version: bcs.u64(),
  revoked: bcs.bool(),
});

const VendorPolicy = bcs.struct("VendorPolicy", {
  id: UID,
  treasury_id: bcs.Address,
  vendor: bcs.Address,
  active: bcs.bool(),
  max_payment: bcs.u64(),
  allowed_bucket: bcs.u8(),
  valid_until_ms: bcs.u64(),
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

export type AgentMandateSnapshot = {
  id: string;
  treasuryId: string;
  agent: string;
  maxPerPayment: bigint;
  periodLimit: bigint;
  periodSpent: bigint;
  periodStartedAtMs: bigint;
  periodDurationMs: bigint;
  validFromMs: bigint;
  validUntilMs: bigint;
  approvalThreshold: bigint;
  maxRebalance: bigint;
  policyVersion: bigint;
  revoked: boolean;
};

export type VendorPolicySnapshot = {
  id: string;
  treasuryId: string;
  vendor: string;
  active: boolean;
  maxPayment: bigint;
  allowedBucket: number;
  validUntilMs: bigint;
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

export async function readAgentMandate(
  client: ClientWithCoreApi,
  objectId: string,
): Promise<AgentMandateSnapshot> {
  const { object } = await client.core.getObject({
    objectId,
    include: { content: true },
  });
  const parsed = AgentMandate.parse(object.content);
  return {
    id: object.objectId,
    treasuryId: parsed.treasury_id,
    agent: parsed.agent,
    maxPerPayment: BigInt(parsed.max_per_payment),
    periodLimit: BigInt(parsed.period_limit),
    periodSpent: BigInt(parsed.period_spent),
    periodStartedAtMs: BigInt(parsed.period_started_at_ms),
    periodDurationMs: BigInt(parsed.period_duration_ms),
    validFromMs: BigInt(parsed.valid_from_ms),
    validUntilMs: BigInt(parsed.valid_until_ms),
    approvalThreshold: BigInt(parsed.approval_threshold),
    maxRebalance: BigInt(parsed.max_rebalance),
    policyVersion: BigInt(parsed.policy_version),
    revoked: parsed.revoked,
  };
}

export async function readVendorPolicy(
  client: ClientWithCoreApi,
  objectId: string,
): Promise<VendorPolicySnapshot> {
  const { object } = await client.core.getObject({
    objectId,
    include: { content: true },
  });
  const parsed = VendorPolicy.parse(object.content);
  return {
    id: object.objectId,
    treasuryId: parsed.treasury_id,
    vendor: parsed.vendor,
    active: parsed.active,
    maxPayment: BigInt(parsed.max_payment),
    allowedBucket: parsed.allowed_bucket,
    validUntilMs: BigInt(parsed.valid_until_ms),
  };
}
