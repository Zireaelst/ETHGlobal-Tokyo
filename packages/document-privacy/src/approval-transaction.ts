import type { ClientWithCoreApi } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import type { EncryptedDocumentRef } from "./types";

export type AgentDocumentApprovalInput = {
  client: ClientWithCoreApi;
  packageId: string;
  coinType: string;
  treasuryId: string;
  mandateId: string;
  agentCapId: string;
  sender: string;
  ref: EncryptedDocumentRef;
};

export async function buildAgentDocumentApproval(
  input: AgentDocumentApprovalInput,
): Promise<Uint8Array> {
  if (input.ref.sealPolicyId !== input.treasuryId) {
    throw new Error("Seal policy ID must equal the treasury object ID");
  }
  const transaction = new Transaction();
  // Required because AgentCap is owned. Seal key servers dry-run this PTB.
  transaction.setSender(input.sender);
  transaction.moveCall({
    target: `${input.packageId}::document_policy::seal_approve`,
    typeArguments: [input.coinType],
    arguments: [
      transaction.pure.vector("u8", fromHex(input.ref.sealPolicyId)),
      transaction.object(input.treasuryId),
      transaction.object(input.mandateId),
      transaction.object(input.agentCapId),
      transaction.object("0x6"),
    ],
  });
  return transaction.build({
    client: input.client,
    onlyTransactionKind: true,
  });
}
