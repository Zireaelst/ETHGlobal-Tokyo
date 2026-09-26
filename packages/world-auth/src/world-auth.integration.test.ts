import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import { beforeAll, describe, expect, it } from "vitest";
import { beginFreshAuthorization, InMemoryAuthorizationStore } from "./verifier";

beforeAll(() => {
  process.loadEnvFile("../../.env");
});

describe("World sandbox OIDC", () => {
  it("accepts Coffer's registered client and exact HTTPS callback", async () => {
    const nowMs = Date.now();
    const action: ActionAuthorizationPayload = {
      treasuryId: "0x155cee8c8cf1a3c356b922ad26c5a5017a31b12597f96b6dd004f1fa9becd797",
      paymentRequestId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      vendor: "0xa5e5fe2e7b3e9a47d4a692ec1d55b30e7330735f7477cf17329ab5bcaff0f92b",
      amount: "240000000",
      expiresAtMs: nowMs + 300_000,
      nonce: crypto.randomUUID(),
    };
    const issuer = process.env.WORLD_OIDC_ISSUER!;
    const request = await beginFreshAuthorization({
      issuer,
      clientId: process.env.WORLD_OIDC_CLIENT_ID!,
      redirectUri: process.env.WORLD_OIDC_REDIRECT_URI!,
      maxAgeSeconds: Number(process.env.WORLD_OIDC_MAX_AGE_SECONDS),
      nowMs,
      store: new InMemoryAuthorizationStore(),
      action,
    });

    const response = await fetch(request.authorizationUrl, { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/^\/authorize\?transaction_id=/);
  });
});

