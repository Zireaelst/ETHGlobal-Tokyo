import { Transaction } from "@mysten/sui/transactions";

const SUI_CLOCK_ID = "0x6";

type PackageInput = {
  packageId: string;
};

type CoinPackageInput = PackageInput & {
  coinType: string;
};

export function buildCreateTreasury(
  input: CoinPackageInput & {
    organization: string;
    adminAddress: string;
  },
): Transaction {
  const transaction = new Transaction();
  const adminCap = transaction.moveCall({
    target: `${input.packageId}::treasury::create`,
    typeArguments: [input.coinType],
    arguments: [transaction.pure.string(input.organization)],
  });
  transaction.transferObjects([adminCap], transaction.pure.address(input.adminAddress));
  return transaction;
}

export function buildFundDemoTreasury(
  input: CoinPackageInput & {
    demoTreasuryCapId: string;
    adminCapId: string;
    treasuryId: string;
    mintAmount: bigint;
    vendorCommittedAmount: bigint;
  },
): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${input.packageId}::demo_usd::mint_and_deposit`,
    arguments: [
      transaction.object(input.demoTreasuryCapId),
      transaction.object(input.treasuryId),
      transaction.pure.u64(input.mintAmount),
    ],
  });
  transaction.moveCall({
    target: `${input.packageId}::treasury::admin_rebalance`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.adminCapId),
      transaction.object(input.treasuryId),
      transaction.pure.u8(0),
      transaction.pure.u8(2),
      transaction.pure.u64(input.vendorCommittedAmount),
    ],
  });
  return transaction;
}

export type SubmitRequestInput = CoinPackageInput & {
  vendorCapId: string;
  vendorPolicyId: string;
  treasuryId: string;
  amount: bigint;
  bucket: number;
  dueAtMs: bigint;
  expiresAtMs: bigint;
  policyVersion: bigint;
  invoiceDigest: Uint8Array;
  walrusBlobId: string;
  sealPolicyId: string;
  actionDigest: Uint8Array;
};

export function buildSubmitRequest(input: SubmitRequestInput): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${input.packageId}::payment_request::submit`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.vendorCapId),
      transaction.object(input.vendorPolicyId),
      transaction.object(input.treasuryId),
      transaction.pure.u64(input.amount),
      transaction.pure.u8(input.bucket),
      transaction.pure.u64(input.dueAtMs),
      transaction.pure.u64(input.expiresAtMs),
      transaction.pure.u64(input.policyVersion),
      transaction.pure.vector("u8", Array.from(input.invoiceDigest)),
      transaction.pure.string(input.walrusBlobId),
      transaction.pure.id(input.sealPolicyId),
      transaction.pure.vector("u8", Array.from(input.actionDigest)),
    ],
  });
  return transaction;
}

export function buildBindWorldAction(
  input: PackageInput & {
    vendorCapId: string;
    vendorPolicyId: string;
    requestId: string;
    actionDigest: Uint8Array;
  },
): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${input.packageId}::payment_request::bind_world_action`,
    arguments: [
      transaction.object(input.vendorCapId),
      transaction.object(input.vendorPolicyId),
      transaction.object(input.requestId),
      transaction.pure.vector("u8", Array.from(input.actionDigest)),
    ],
  });
  return transaction;
}

export type ExecuteWithinMandateInput = CoinPackageInput & {
  agentCap: string;
  mandate: string;
  vendorPolicy: string;
  treasury: string;
  request: string;
};

export function buildExecuteWithinMandate(
  input: ExecuteWithinMandateInput,
): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${input.packageId}::payment_request::execute_within_mandate`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.agentCap),
      transaction.object(input.mandate),
      transaction.object(input.vendorPolicy),
      transaction.object(input.treasury),
      transaction.object(input.request),
      transaction.object(SUI_CLOCK_ID),
    ],
  });
  return transaction;
}

export function buildMintAuthorizationTicket(
  input: PackageInput & {
    verifierCapId: string;
    treasuryId: string;
    paymentRequestId: string;
    vendor: string;
    actionDigest: Uint8Array;
    maxAmount: bigint;
    expiresAtMs: bigint;
    nonce: Uint8Array;
    recipient: string;
  },
): Transaction {
  const transaction = new Transaction();
  const ticket = transaction.moveCall({
    target: `${input.packageId}::authorization::mint_ticket`,
    arguments: [
      transaction.object(input.verifierCapId),
      transaction.pure.id(input.treasuryId),
      transaction.pure.id(input.paymentRequestId),
      transaction.pure.address(input.vendor),
      transaction.pure.vector("u8", Array.from(input.actionDigest)),
      transaction.pure.u64(input.maxAmount),
      transaction.pure.u64(input.expiresAtMs),
      transaction.pure.vector("u8", Array.from(input.nonce)),
    ],
  });
  transaction.transferObjects([ticket], transaction.pure.address(input.recipient));
  return transaction;
}

export function buildExecuteWithAuthorization(
  input: CoinPackageInput & {
    ticketId: string;
    treasuryId: string;
    requestId: string;
  },
): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${input.packageId}::payment_request::execute_with_authorization`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.ticketId),
      transaction.object(input.treasuryId),
      transaction.object(input.requestId),
      transaction.object(SUI_CLOCK_ID),
    ],
  });
  return transaction;
}

export function buildExecuteFreshWorldAuthorization(
  input: CoinPackageInput & {
    verifierCapId: string;
    treasuryId: string;
    requestId: string;
    vendor: string;
    actionDigest: Uint8Array;
    maxAmount: bigint;
    expiresAtMs: bigint;
    nonce: Uint8Array;
  },
): Transaction {
  const transaction = new Transaction();
  const ticket = transaction.moveCall({
    target: `${input.packageId}::authorization::mint_ticket`,
    arguments: [
      transaction.object(input.verifierCapId),
      transaction.pure.id(input.treasuryId),
      transaction.pure.id(input.requestId),
      transaction.pure.address(input.vendor),
      transaction.pure.vector("u8", Array.from(input.actionDigest)),
      transaction.pure.u64(input.maxAmount),
      transaction.pure.u64(input.expiresAtMs),
      transaction.pure.vector("u8", Array.from(input.nonce)),
    ],
  });
  transaction.moveCall({
    target: `${input.packageId}::payment_request::execute_with_authorization`,
    typeArguments: [input.coinType],
    arguments: [
      ticket,
      transaction.object(input.treasuryId),
      transaction.object(input.requestId),
      transaction.object(SUI_CLOCK_ID),
    ],
  });
  return transaction;
}

export type ExecuteStandingOrderInput = CoinPackageInput & {
  agentCap: string;
  mandate: string;
  vendorPolicy: string;
  treasury: string;
  order: string;
};

export function buildExecuteStandingOrder(
  input: ExecuteStandingOrderInput,
): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${input.packageId}::standing_order::execute_due_order`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.agentCap),
      transaction.object(input.mandate),
      transaction.object(input.vendorPolicy),
      transaction.object(input.treasury),
      transaction.object(input.order),
      transaction.object(SUI_CLOCK_ID),
    ],
  });
  return transaction;
}

export function buildCreateVerifier(
  input: CoinPackageInput & {
    adminCapId: string;
    treasuryId: string;
    recipient: string;
  },
): Transaction {
  const transaction = new Transaction();
  const verifierCap = transaction.moveCall({
    target: `${input.packageId}::authorization::create_verifier`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.adminCapId),
      transaction.object(input.treasuryId),
    ],
  });
  transaction.transferObjects(
    [verifierCap],
    transaction.pure.address(input.recipient),
  );
  return transaction;
}

export function buildRegisterVendor(
  input: CoinPackageInput & {
    adminCapId: string;
    treasuryId: string;
    vendor: string;
    active: boolean;
    maxPayment: bigint;
    allowedBucket: number;
    validUntilMs: bigint;
  },
): Transaction {
  const transaction = new Transaction();
  const vendorCap = transaction.moveCall({
    target: `${input.packageId}::vendor_registry::register`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.adminCapId),
      transaction.object(input.treasuryId),
      transaction.pure.address(input.vendor),
      transaction.pure.bool(input.active),
      transaction.pure.u64(input.maxPayment),
      transaction.pure.u8(input.allowedBucket),
      transaction.pure.u64(input.validUntilMs),
    ],
  });
  transaction.transferObjects([vendorCap], transaction.pure.address(input.vendor));
  return transaction;
}

export function buildCreateMandate(
  input: CoinPackageInput & {
    adminCapId: string;
    treasuryId: string;
    agent: string;
    maxPerPayment: bigint;
    periodLimit: bigint;
    periodDurationMs: bigint;
    validFromMs: bigint;
    validUntilMs: bigint;
    approvalThreshold: bigint;
    maxRebalance: bigint;
    policyVersion: bigint;
  },
): Transaction {
  const transaction = new Transaction();
  const agentCap = transaction.moveCall({
    target: `${input.packageId}::mandate::create`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.adminCapId),
      transaction.object(input.treasuryId),
      transaction.pure.address(input.agent),
      transaction.pure.u64(input.maxPerPayment),
      transaction.pure.u64(input.periodLimit),
      transaction.pure.u64(input.periodDurationMs),
      transaction.pure.u64(input.validFromMs),
      transaction.pure.u64(input.validUntilMs),
      transaction.pure.u64(input.approvalThreshold),
      transaction.pure.u64(input.maxRebalance),
      transaction.pure.u64(input.policyVersion),
    ],
  });
  transaction.transferObjects([agentCap], transaction.pure.address(input.agent));
  return transaction;
}

export function buildCreateStandingOrder(
  input: CoinPackageInput & {
    adminCapId: string;
    treasuryId: string;
    vendor: string;
    amount: bigint;
    bucket: number;
    intervalMs: bigint;
    nextExecutionAtMs: bigint;
    endAtMs: bigint;
    maxExecutions: bigint;
    policyVersion: bigint;
  },
): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    target: `${input.packageId}::standing_order::create_shared`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.object(input.adminCapId),
      transaction.object(input.treasuryId),
      transaction.pure.address(input.vendor),
      transaction.pure.u64(input.amount),
      transaction.pure.u8(input.bucket),
      transaction.pure.u64(input.intervalMs),
      transaction.pure.u64(input.nextExecutionAtMs),
      transaction.pure.u64(input.endAtMs),
      transaction.pure.u64(input.maxExecutions),
      transaction.pure.u64(input.policyVersion),
    ],
  });
  return transaction;
}
