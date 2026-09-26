import { describe, expect, it } from "vitest";
import { SealWalrusDocumentPrivacy } from "./seal-walrus";
import {
  AccessDeniedError,
  IntegrityError,
  PrivacyUnavailableError,
} from "./types";

const POLICY_ID = "0xpolicy";

function fixture() {
  const blobs = new Map<string, Uint8Array>();
  let lastWritten: Uint8Array | undefined;
  let nextBlobId = 1;
  const walrus = {
    async writeBlob(input: { blob: Uint8Array }) {
      const blobId = `blob-${nextBlobId++}`;
      lastWritten = input.blob.slice();
      blobs.set(blobId, input.blob.slice());
      return { blobId };
    },
    async readBlob(input: { blobId: string }) {
      const blob = blobs.get(input.blobId);
      if (!blob) throw new Error("blob unavailable");
      return blob.slice();
    },
  };
  const seal = {
    async encrypt(input: { data: Uint8Array }) {
      return {
        encryptedObject: input.data.map((byte) => byte ^ 0xa5),
      };
    },
    async decrypt(input: { data: Uint8Array }) {
      return input.data.map((byte) => byte ^ 0xa5);
    },
  };
  const privacy = new SealWalrusDocumentPrivacy({
    packageId: "0xpackage",
    policyId: POLICY_ID,
    threshold: 2,
    seal,
    walrus,
    signer: {},
    sessionKey: {},
    buildApprovalTransaction: async () => new Uint8Array([1, 2, 3]),
  });
  return { blobs, privacy, seal, walrus, getLastWritten: () => lastWritten };
}

describe("SealWalrusDocumentPrivacy", () => {
  it("encrypts before upload and round-trips for the configured policy", async () => {
    const { privacy, getLastWritten } = fixture();
    const plaintext = new TextEncoder().encode("invoice: vendor A, 80 DemoUSD");

    const ref = await privacy.put(plaintext, POLICY_ID);

    expect(getLastWritten()).toBeDefined();
    expect(getLastWritten()).not.toEqual(plaintext);
    await expect(privacy.get(ref)).resolves.toEqual(plaintext);
  });

  it("rejects a different policy before returning any plaintext", async () => {
    const { privacy } = fixture();
    const ref = await privacy.put(new Uint8Array([1, 2, 3]), POLICY_ID);

    await expect(
      privacy.get({ ...ref, sealPolicyId: "0xother-policy" }),
    ).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("rejects a corrupted blob after decryption", async () => {
    const { blobs, privacy } = fixture();
    const ref = await privacy.put(new Uint8Array([1, 2, 3]), POLICY_ID);
    blobs.set(ref.blobId, new Uint8Array([9, 9, 9]));

    await expect(privacy.get(ref)).rejects.toBeInstanceOf(IntegrityError);
  });

  it("fails closed when Walrus is unavailable", async () => {
    const { privacy, walrus } = fixture();
    walrus.writeBlob = async () => {
      throw new Error("network down");
    };

    await expect(
      privacy.put(new Uint8Array([1]), POLICY_ID),
    ).rejects.toBeInstanceOf(PrivacyUnavailableError);
  });

  it("fails closed when Seal denies decryption", async () => {
    const { privacy, seal } = fixture();
    const ref = await privacy.put(new Uint8Array([1, 2, 3]), POLICY_ID);
    seal.decrypt = async () => {
      throw new Error("policy denied");
    };

    await expect(privacy.get(ref)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});
