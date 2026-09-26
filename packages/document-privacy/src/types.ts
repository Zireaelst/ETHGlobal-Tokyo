export type EncryptedDocumentRef = {
  blobId: string;
  plaintextDigest: string;
  sealPolicyId: string;
};

export interface DocumentPrivacy {
  put(input: Uint8Array, policyId: string): Promise<EncryptedDocumentRef>;
  get(ref: EncryptedDocumentRef): Promise<Uint8Array>;
}

export class PrivacyUnavailableError extends Error {
  override readonly name = "PrivacyUnavailableError";
}

export class AccessDeniedError extends Error {
  override readonly name = "AccessDeniedError";
}

export class IntegrityError extends Error {
  override readonly name = "IntegrityError";
}
