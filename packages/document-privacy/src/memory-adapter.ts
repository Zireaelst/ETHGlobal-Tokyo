import { createHash, randomBytes, randomUUID, webcrypto } from "node:crypto";
import {
  AccessDeniedError,
  IntegrityError,
  PrivacyUnavailableError,
  type DocumentPrivacy,
  type EncryptedDocumentRef,
} from "./types";

type StoredDocument = {
  ciphertext: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  policyId: string;
};

function digest(input: Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

function ownedBytes(input: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy;
}

/** Local development adapter only; production must use Seal + Walrus. */
export class MemoryDocumentPrivacy implements DocumentPrivacy {
  readonly #documents = new Map<string, StoredDocument>();
  readonly #key = webcrypto.subtle.importKey(
    "raw",
    randomBytes(32),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  async put(
    input: Uint8Array,
    policyId: string,
  ): Promise<EncryptedDocumentRef> {
    const blobId = randomUUID();
    const iv = ownedBytes(randomBytes(12));
    try {
      const ciphertext = new Uint8Array(
        await webcrypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          await this.#key,
          ownedBytes(input),
        ),
      );
      this.#documents.set(blobId, { ciphertext, iv, policyId });
      return {
        blobId,
        plaintextDigest: digest(input),
        sealPolicyId: policyId,
      };
    } catch (error) {
      throw new PrivacyUnavailableError(
        `Local encryption failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  async get(ref: EncryptedDocumentRef): Promise<Uint8Array> {
    const stored = this.#documents.get(ref.blobId);
    if (!stored) {
      throw new PrivacyUnavailableError("Encrypted local document was not found");
    }
    if (stored.policyId !== ref.sealPolicyId) {
      throw new AccessDeniedError("Local document policy mismatch");
    }
    let plaintext: Uint8Array;
    try {
      plaintext = new Uint8Array(
        await webcrypto.subtle.decrypt(
          { name: "AES-GCM", iv: stored.iv },
          await this.#key,
          stored.ciphertext,
        ),
      );
    } catch (error) {
      throw new AccessDeniedError(
        `Local decryption failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    if (digest(plaintext) !== ref.plaintextDigest) {
      throw new IntegrityError("Local document digest mismatch");
    }
    return plaintext;
  }
}
