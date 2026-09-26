export type DataSource = "live" | "verified" | "demo";

export type AgentOutcome =
  | "auto_execute"
  | "hold"
  | "reject"
  | "human_authorization";

export type RequestStatus =
  | "executed"
  | "held"
  | "rejected"
  | "awaiting_authorization";

export type PolicyCheck = {
  code: string;
  label: string;
  result: "pass" | "fail" | "review";
  detail: string;
};

export type CommercialDocumentRef = {
  blobId: string;
  encrypted: true;
  storage: "seal-walrus";
  accessState: "policy_granted" | "approval_required" | "denied";
  displayName: string;
};

export type PaymentRequestRecord = {
  id: string;
  vendor: string;
  vendorAddress: string;
  amountBaseUnits: string;
  currency: "DEMO_USD";
  dueAt: string;
  createdAt: string;
  sourceBucket: "Operating" | "Reserve" | "Vendor committed";
  dataSource: DataSource;
  outcome: AgentOutcome;
  status: RequestStatus;
  reasonCode: string;
  extractionConfidence: number;
  document: CommercialDocumentRef;
  checks: readonly PolicyCheck[];
  transactionDigest?: string;
  actionDigest?: string;
};

export type DemoRecord = {
  id: string;
  dataSource: "demo";
};
