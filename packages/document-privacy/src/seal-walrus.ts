import { createHash } from "node:crypto";
import type { SealClient, SessionKey } from "@mysten/seal";
import type { Signer } from "@mysten/sui/cryptography";
import type { WalrusClient } from "@mysten/walrus";
import {
  AccessDeniedError,
  IntegrityError,
  PrivacyUnavailableError,
  type DocumentPrivacy,
  type EncryptedDocumentRef,
} from "./types";

export interface SealOperations<Session> {
  encrypt(input: {
    threshold: number;
    packageId: string;
    id: string;
    data: Uint8Array;
  }): Promise<{ encryptedObject: Uint8Array }>;
  decrypt(input: {
    data: Uint8Array;
    sessionKey: Session;
    txBytes: Uint8Array;
  }): Promise<Uint8Array>;
}

export interface WalrusOperations<WalletSigner> {
  writeBlob(input: {
    blob: Uint8Array;
    deletable: boolean;
    epochs: number;
    signer: WalletSigner;
  }): Promise<{ blobId: string }>;
  readBlob(input: { blobId: string }): Promise<Uint8Array>;
}

export type SealWalrusOptions<Session, WalletSigner> = {
  packageId: string;
  policyId: string;
  threshold: number;
  epochs?: number;
  deletable?: boolean;
  seal: SealOperations<Session>;
  walrus: WalrusOperations<WalletSigner>;
  signer: WalletSigner;
  sessionKey: Session;
  buildApprovalTransaction(ref: EncryptedDocumentRef): Promise<Uint8Array>;
};

// These aliases keep the adapter structurally aligned with the currently installed
// official SDKs while leaving tests free to use in-memory fakes.
export type OfficialSealOperations = Pick<SealClient, "encrypt" | "decrypt">;
export type OfficialWalrusOperations = Pick<WalrusClient, "writeBlob" | "readBlob">;
export type OfficialSealWalrusOptions = SealWalrusOptions<SessionKey, Signer> & {
  seal: OfficialSealOperations;
  walrus: OfficialWalrusOperations;
};

function digest(input: Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown privacy service error";
}

export class SealWalrusDocumentPrivacy<Session, WalletSigner>
  implements DocumentPrivacy
{
  readonly #options: Required<
    Pick<SealWalrusOptions<Session, WalletSigner>, "epochs" | "deletable">
  > &
    Omit<SealWalrusOptions<Session, WalletSigner>, "epochs" | "deletable">;

  constructor(options: SealWalrusOptions<Session, WalletSigner>) {
    if (options.threshold < 1) {
      throw new Error("Seal threshold must be at least one");
    }
    this.#options = {
      ...options,
      epochs: options.epochs ?? 3,
      deletable: options.deletable ?? false,
    };
  }

  async put(
    input: Uint8Array,
    policyId: string,
  ): Promise<EncryptedDocumentRef> {
    if (policyId !== this.#options.policyId) {
      throw new AccessDeniedError("Document policy is not configured for this treasury");
    }

    let encryptedObject: Uint8Array;
    try {
      ({ encryptedObject } = await this.#options.seal.encrypt({
        threshold: this.#options.threshold,
        packageId: this.#options.packageId,
        id: policyId,
        data: input,
      }));
    } catch (error) {
      throw new PrivacyUnavailableError(`Seal encryption failed: ${message(error)}`);
    }

    try {
      const { blobId } = await this.#options.walrus.writeBlob({
        blob: encryptedObject,
        deletable: this.#options.deletable,
        epochs: this.#options.epochs,
        signer: this.#options.signer,
      });
      if (!blobId) {
        throw new Error("Walrus returned an empty blob ID");
      }
      return {
        blobId,
        plaintextDigest: digest(input),
        sealPolicyId: policyId,
      };
    } catch (error) {
      throw new PrivacyUnavailableError(`Walrus upload failed: ${message(error)}`);
    }
  }

  async get(ref: EncryptedDocumentRef): Promise<Uint8Array> {
    if (ref.sealPolicyId !== this.#options.policyId) {
      throw new AccessDeniedError("Encrypted document belongs to another Seal policy");
    }

    let encryptedObject: Uint8Array;
    try {
      encryptedObject = await this.#options.walrus.readBlob({ blobId: ref.blobId });
    } catch (error) {
      throw new PrivacyUnavailableError(`Walrus read failed: ${message(error)}`);
    }

    let plaintext: Uint8Array;
    try {
      const txBytes = await this.#options.buildApprovalTransaction(ref);
      plaintext = await this.#options.seal.decrypt({
        data: encryptedObject,
        sessionKey: this.#options.sessionKey,
        txBytes,
      });
    } catch (error) {
      throw new AccessDeniedError(`Seal decryption was not authorized: ${message(error)}`);
    }

    if (digest(plaintext) !== ref.plaintextDigest) {
      throw new IntegrityError("Decrypted document digest does not match its reference");
    }
    return new Uint8Array(plaintext);
  }
}
