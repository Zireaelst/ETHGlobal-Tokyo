import { TESTNET_DEPLOYMENT } from "../deployment";
import type { DemoRecord, PaymentRequestRecord, PolicyCheck } from "../requests/model";

const vendorApproved: PolicyCheck = {
  code: "VENDOR_APPROVED",
  label: "Approved counterparty",
  result: "pass",
  detail: "Vendor is present in policy version 3.2.1.",
};

const bucketAvailable: PolicyCheck = {
  code: "BUCKET_AVAILABLE",
  label: "Bucket liquidity",
  result: "pass",
  detail: "The selected bucket covers the obligation.",
};

const mandateActive: PolicyCheck = {
  code: "MANDATE_ACTIVE",
  label: "Mandate window",
  result: "pass",
  detail: "The agent mandate is active and has not been revoked.",
};

const approvedChecks: readonly PolicyCheck[] = [
  vendorApproved,
  bucketAvailable,
  mandateActive,
];

export const TREASURY_BUCKETS = Object.freeze([
  { name: "Operating", balanceBaseUnits: "620000000", policy: "Day-to-day expenses" },
  { name: "Reserve", balanceBaseUnits: "1250000000", policy: "Policy protected" },
  {
    name: "Vendor committed",
    balanceBaseUnits: "430000000",
    policy: "Approved obligations",
  },
] as const);

export const DEMO_REQUESTS: readonly PaymentRequestRecord[] = Object.freeze([
  {
    id: "REQ-2048",
    vendor: "Mirai Logistics",
    vendorAddress: "0xa5e5…f92b",
    amountBaseUnits: "80000000",
    currency: "DEMO_USD",
    dueAt: "2026-09-28T09:00:00.000Z",
    createdAt: "2026-09-26T12:02:00.000Z",
    sourceBucket: "Operating",
    dataSource: "verified",
    outcome: "auto_execute",
    status: "executed",
    reasonCode: "WITHIN_MANDATE",
    extractionConfidence: 0.98,
    document: {
      blobId: TESTNET_DEPLOYMENT.agentDemo.documentBlobId,
      encrypted: true,
      storage: "seal-walrus",
      accessState: "policy_granted",
      displayName: "mirai-logistics-september.enc",
    },
    checks: approvedChecks,
    transactionDigest: TESTNET_DEPLOYMENT.agentDemo.executionDigest,
  },
  {
    id: "REQ-2051",
    vendor: "Kintsugi Cloud",
    vendorAddress: "0xa5e5…f92b",
    amountBaseUnits: "300000000",
    currency: "DEMO_USD",
    dueAt: "2026-09-29T03:00:00.000Z",
    createdAt: "2026-09-26T12:11:00.000Z",
    sourceBucket: "Reserve",
    dataSource: "verified",
    outcome: "human_authorization",
    status: "executed",
    reasonCode: "HUMAN_APPROVAL_THRESHOLD_EXCEEDED",
    extractionConfidence: 0.97,
    document: {
      blobId: TESTNET_DEPLOYMENT.worldDemo.documentBlobId,
      encrypted: true,
      storage: "seal-walrus",
      accessState: "approval_required",
      displayName: "kintsugi-cloud-capacity.enc",
    },
    checks: [
      ...approvedChecks,
      {
        code: "HUMAN_APPROVAL_THRESHOLD_EXCEEDED",
        label: "Material payment threshold",
        result: "review",
        detail: "The request exceeds the 250 DEMO_USD autonomous limit.",
      },
    ],
    actionDigest: TESTNET_DEPLOYMENT.worldDemo.actionDigest,
    transactionDigest: TESTNET_DEPLOYMENT.worldDemo.executionDigest,
  },
  {
    id: "REQ-2054",
    vendor: "Shinkansen Facilities",
    vendorAddress: "0x91c2…55d4",
    amountBaseUnits: "180000000",
    currency: "DEMO_USD",
    dueAt: "2026-10-02T00:00:00.000Z",
    createdAt: "2026-09-26T12:23:00.000Z",
    sourceBucket: "Reserve",
    dataSource: "demo",
    outcome: "hold",
    status: "held",
    reasonCode: "PROJECTED_RESERVE_SHORTFALL",
    extractionConfidence: 0.94,
    document: {
      blobId: "demo-walrus-shinkansen-facilities",
      encrypted: true,
      storage: "seal-walrus",
      accessState: "policy_granted",
      displayName: "facilities-maintenance-q4.enc",
    },
    checks: [
      vendorApproved,
      {
        code: "PROJECTED_RESERVE_SHORTFALL",
        label: "Forward liquidity",
        result: "review",
        detail: "A standing order due in three days would breach the reserve floor.",
      },
      mandateActive,
    ],
  },
  {
    id: "REQ-2056",
    vendor: "Northstar Data Exchange",
    vendorAddress: "0x0bad…cafe",
    amountBaseUnits: "55000000",
    currency: "DEMO_USD",
    dueAt: "2026-09-27T15:00:00.000Z",
    createdAt: "2026-09-26T12:37:00.000Z",
    sourceBucket: "Operating",
    dataSource: "demo",
    outcome: "reject",
    status: "rejected",
    reasonCode: "COUNTERPARTY_NOT_APPROVED",
    extractionConfidence: 0.91,
    document: {
      blobId: "demo-walrus-northstar-data",
      encrypted: true,
      storage: "seal-walrus",
      accessState: "denied",
      displayName: "northstar-data-invoice.enc",
    },
    checks: [
      {
        code: "COUNTERPARTY_NOT_APPROVED",
        label: "Approved counterparty",
        result: "fail",
        detail: "Vendor address is absent from policy version 3.2.1.",
      },
      bucketAvailable,
      mandateActive,
    ],
  },
]);

type VendorRecord = DemoRecord & {
  name: string;
  category: string;
  status: "approved" | "review";
  monthlyCommittedBaseUnits: string;
};

export const DEMO_VENDORS: readonly VendorRecord[] = Object.freeze([
  {
    id: "vendor-mirai",
    dataSource: "demo",
    name: "Mirai Logistics",
    category: "Operations",
    status: "approved",
    monthlyCommittedBaseUnits: "80000000",
  },
  {
    id: "vendor-kintsugi",
    dataSource: "demo",
    name: "Kintsugi Cloud",
    category: "Infrastructure",
    status: "approved",
    monthlyCommittedBaseUnits: "300000000",
  },
]);

export const DEMO_DOCUMENTS = Object.freeze([
  {
    id: "doc-mirai-09",
    dataSource: "demo" as const,
    name: "Mirai Logistics · September",
    storage: "Walrus ciphertext",
    access: "Seal policy granted",
  },
  {
    id: "doc-kintsugi-capacity",
    dataSource: "demo" as const,
    name: "Kintsugi Cloud · Capacity",
    storage: "Walrus ciphertext",
    access: "Human authorization required",
  },
]);

export const DEMO_POLICIES = Object.freeze([
  {
    id: "policy-treasury-3-2-1",
    dataSource: "demo" as const,
    name: "Treasury mandate",
    version: "3.2.1",
    status: "Active",
    autonomousLimitBaseUnits: "250000000",
  },
]);

export const DEMO_USERS = Object.freeze([
  {
    id: "user-aiko",
    dataSource: "demo" as const,
    name: "Aiko Tanaka",
    role: "Treasury owner",
    access: "Policy administration",
  },
  {
    id: "user-ren",
    dataSource: "demo" as const,
    name: "Ren Mori",
    role: "Controller",
    access: "Audit and approvals",
  },
]);

export const DEMO_STANDING_ORDERS = Object.freeze([
  {
    id: "order-mirai-monthly",
    dataSource: "demo" as const,
    vendor: "Mirai Logistics",
    amountBaseUnits: "80000000",
    bucket: "Vendor committed",
    cadence: "Every 30 days",
    nextRunAt: "2026-09-29T09:00:00.000Z",
    status: "Active",
  },
]);

export const DEMO_AUDIT_EVENTS = Object.freeze([
  {
    id: "audit-auto-execute",
    dataSource: "demo" as const,
    occurredAt: "2026-09-26T12:04:00.000Z",
    actor: "Treasury agent",
    action: "Executed within mandate",
    requestId: "REQ-2048",
  },
  {
    id: "audit-shortfall",
    dataSource: "demo" as const,
    occurredAt: "2026-09-26T12:24:00.000Z",
    actor: "Treasury agent",
    action: "Held for projected reserve shortfall",
    requestId: "REQ-2054",
  },
]);
