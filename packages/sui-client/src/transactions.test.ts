import { describe, expect, it } from "vitest";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  buildCreateTreasury,
  buildFundDemoTreasury,
  buildExecuteStandingOrder,
  buildExecuteWithAuthorization,
  buildExecuteWithinMandate,
  buildMintAuthorizationTicket,
  buildSubmitRequest,
} from "./transactions";

const PACKAGE_ID = "0x111";
const COIN_TYPE = "0x111::demo_usd::DEMO_USD";
const ids = {
  treasury: "0x101",
  agentCap: "0x102",
  mandate: "0x103",
  vendorPolicy: "0x104",
  request: "0x105",
  ticket: "0x106",
  order: "0x107",
  verifierCap: "0x108",
};

function targets(transaction: ReturnType<typeof buildExecuteWithinMandate>) {
  return transaction
    .getData()
    .commands.filter((command) => command.$kind === "MoveCall")
    .map((command) => {
      const call = command.MoveCall;
      return `${call.package}::${call.module}::${call.function}`;
    });
}

function serialized(transaction: { getData(): unknown }) {
  return JSON.stringify(transaction.getData());
}

describe("Coffer Sui transaction builders", () => {
  it("creates a shared treasury and transfers only the admin capability", () => {
    const transaction = buildCreateTreasury({
      packageId: PACKAGE_ID,
      coinType: COIN_TYPE,
      organization: "Tokyo Treasury",
      adminAddress: "0xabc",
    });
    expect(targets(transaction)).toEqual([
      `${normalizeSuiAddress(PACKAGE_ID)}::treasury::create`,
    ]);
    expect(transaction.getData().commands.at(-1)?.$kind).toBe("TransferObjects");
  });

  it("funds the demo treasury and allocates vendor committed funds atomically", () => {
    const transaction = buildFundDemoTreasury({
      packageId: PACKAGE_ID,
      coinType: COIN_TYPE,
      demoTreasuryCapId: "0x301",
      adminCapId: "0x302",
      treasuryId: ids.treasury,
      mintAmount: 1_000_000n,
      vendorCommittedAmount: 400_000n,
    });
    expect(targets(transaction)).toEqual([
      `${normalizeSuiAddress(PACKAGE_ID)}::demo_usd::mint_and_deposit`,
      `${normalizeSuiAddress(PACKAGE_ID)}::treasury::admin_rebalance`,
    ]);
  });

  it("submits encrypted document commitments, not plaintext", () => {
    const transaction = buildSubmitRequest({
      packageId: PACKAGE_ID,
      coinType: COIN_TYPE,
      vendorCapId: "0x201",
      vendorPolicyId: ids.vendorPolicy,
      treasuryId: ids.treasury,
      amount: 240n,
      bucket: 2,
      dueAtMs: 1_000n,
      expiresAtMs: 5_000n,
      policyVersion: 1n,
      invoiceDigest: new Uint8Array(32).fill(1),
      walrusBlobId: "walrus-blob-id",
      sealPolicyId: ids.treasury,
      actionDigest: new Uint8Array(32).fill(2),
    });
    expect(targets(transaction)[0]).toContain("::payment_request::submit");
    const hasBlobCommitment = transaction.getData().inputs.some(
      (input) =>
        input.$kind === "Pure" &&
        Buffer.from(input.Pure.bytes, "base64").includes(
          Buffer.from("walrus-blob-id"),
        ),
    );
    expect(hasBlobCommitment).toBe(true);
    expect(serialized(transaction)).not.toContain("invoice line item");
  });

  it("uses the canonical Sui Clock for mandate execution", () => {
    const transaction = buildExecuteWithinMandate({
      packageId: PACKAGE_ID,
      coinType: COIN_TYPE,
      ...ids,
    });
    expect(targets(transaction)[0]).toContain(
      "::payment_request::execute_within_mandate",
    );
    expect(serialized(transaction)).toContain(
      "0x0000000000000000000000000000000000000000000000000000000000000006",
    );
  });

  it("mints an action-bound ticket and transfers it to its recipient", () => {
    const transaction = buildMintAuthorizationTicket({
      packageId: PACKAGE_ID,
      verifierCapId: ids.verifierCap,
      treasuryId: ids.treasury,
      paymentRequestId: ids.request,
      vendor: "0xcafe",
      actionDigest: new Uint8Array(32).fill(3),
      maxAmount: 240n,
      expiresAtMs: 2_000n,
      nonce: new Uint8Array(32).fill(4),
      recipient: "0xabc",
    });
    expect(targets(transaction)[0]).toContain("::authorization::mint_ticket");
    expect(transaction.getData().commands.at(-1)?.$kind).toBe("TransferObjects");
  });

  it("consumes the ticket and includes Clock for exception execution", () => {
    const transaction = buildExecuteWithAuthorization({
      packageId: PACKAGE_ID,
      coinType: COIN_TYPE,
      ticketId: ids.ticket,
      treasuryId: ids.treasury,
      requestId: ids.request,
    });
    expect(targets(transaction)[0]).toContain(
      "::payment_request::execute_with_authorization",
    );
    expect(serialized(transaction)).toContain("00000000000000000000000000000006");
  });

  it("uses Clock for scheduled execution and never accepts secret material", () => {
    const transaction = buildExecuteStandingOrder({
      packageId: PACKAGE_ID,
      coinType: COIN_TYPE,
      ...ids,
    });
    expect(targets(transaction)[0]).toContain("::standing_order::execute_due_order");
    const data = serialized(transaction);
    expect(data).toContain("00000000000000000000000000000006");
    expect(data.toLowerCase()).not.toContain("privatekey");
    expect(data.toLowerCase()).not.toContain("secretkey");
  });
});
