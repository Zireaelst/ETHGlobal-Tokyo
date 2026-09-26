import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import { describe, expect, it, vi } from "vitest";
import {
  AuthorizationCancelledError,
  AuthorizationExpiredError,
  AuthorizationReplayError,
  AuthorizationValidationError,
  InMemoryAuthorizationStore,
  type AuthorizationRequest,
  type VerifiedAuthorization,
} from "./verifier";
import { createWorldAuthorizationGateway } from "./gateway";

const action: ActionAuthorizationPayload = {
  treasuryId: "0xtreasury",
  paymentRequestId: "0xrequest",
  vendor: "0xvendor",
  amount: "240",
  expiresAtMs: 1_800_000_120_000,
  nonce: "action-nonce-00000001",
};

const authorization: AuthorizationRequest = {
  authorizationUrl: "https://sandbox.auth.world.org/authorize?state=world-state",
  state: "world-state",
  oidcNonce: "world-nonce",
  actionDigest: "abcd",
};

const verified: VerifiedAuthorization = {
  issuer: "https://sandbox.auth.world.org",
  subject: "pairwise-subject",
  authTime: 1_800_000_000,
  actionDigest: "abcd",
  actionNonce: action.nonce,
};

function request(path: string, init?: RequestInit) {
  return new Request(`http://localhost:3000${path}`, init);
}

describe("World authorization HTTP gateway", () => {
  it("rejects an unsafe app return URI at construction", () => {
    expect(() => createWorldAuthorizationGateway({
      config: {
        issuer: "https://sandbox.auth.world.org",
        clientId: "client-id",
        clientSecret: "server-secret",
        redirectUri: "https://coffer.example/api/world/callback",
        maxAgeSeconds: 120,
        appReturnUri: "http://attacker.example",
      },
      store: new InMemoryAuthorizationStore(),
      onVerified: vi.fn(),
    })).toThrow(/appReturnUri/i);
  });

  it("starts a fresh authorization for the exact requested action", async () => {
    const beginAuthorization = vi.fn(async () => authorization);
    const gateway = createWorldAuthorizationGateway({
      config: {
        issuer: "https://sandbox.auth.world.org",
        clientId: "client-id",
        clientSecret: "server-secret",
        redirectUri: "https://coffer.example/api/world/callback",
        maxAgeSeconds: 120,
      },
      store: new InMemoryAuthorizationStore(),
      beginAuthorization,
      verifyCallback: vi.fn(),
      onVerified: vi.fn(),
      now: () => 1_800_000_000_000,
    });

    const response = await gateway.handle(
      request("/api/world/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(authorization);
    expect(beginAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ action, nowMs: 1_800_000_000_000 }),
    );
  });

  it("runs the protected action only after a valid callback", async () => {
    const store = new InMemoryAuthorizationStore();
    await store.create({
      state: authorization.state,
      oidcNonce: authorization.oidcNonce,
      pkceVerifier: "pkce-verifier",
      action,
      actionDigest: authorization.actionDigest,
      createdAtMs: 1_800_000_000_000,
      maxAgeSeconds: 120,
    });
    const onVerified = vi.fn(async () => ({ ticketDigest: "0xticket" }));
    const verifyCallback = vi.fn(async () => verified);
    const gateway = createWorldAuthorizationGateway({
      config: {
        issuer: "https://sandbox.auth.world.org",
        clientId: "client-id",
        clientSecret: "server-secret",
        redirectUri: "https://coffer.example/api/world/callback",
        maxAgeSeconds: 120,
      },
      store,
      beginAuthorization: vi.fn(),
      verifyCallback,
      onVerified,
      now: () => 1_800_000_001_000,
    });

    const response = await gateway.handle(
      request("/api/world/callback?state=world-state&code=valid-code"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "authorized",
      actionDigest: "abcd",
      result: { ticketDigest: "0xticket" },
    });
    expect(verifyCallback).toHaveBeenCalledWith(
      expect.objectContaining({ expectedAction: action, code: "valid-code" }),
    );
    expect(onVerified).toHaveBeenCalledWith(verified, action);
  });

  it("does not run the protected action when World authorization is cancelled", async () => {
    const store = new InMemoryAuthorizationStore();
    await store.create({
      state: authorization.state,
      oidcNonce: authorization.oidcNonce,
      pkceVerifier: "pkce-verifier",
      action,
      actionDigest: authorization.actionDigest,
      createdAtMs: 1_800_000_000_000,
      maxAgeSeconds: 120,
    });
    const onVerified = vi.fn();
    const gateway = createWorldAuthorizationGateway({
      config: {
        issuer: "https://sandbox.auth.world.org",
        clientId: "client-id",
        clientSecret: "server-secret",
        redirectUri: "https://coffer.example/api/world/callback",
        maxAgeSeconds: 120,
      },
      store,
      beginAuthorization: vi.fn(),
      verifyCallback: vi.fn(async () => {
        throw new AuthorizationCancelledError("World authorization failed: access_denied");
      }),
      onVerified,
      now: () => 1_800_000_001_000,
    });

    const response = await gateway.handle(
      request("/api/world/callback?state=world-state&error=access_denied"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      status: "cancelled",
    });
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("returns a verified protected action to the fixed app route", async () => {
    const store = new InMemoryAuthorizationStore();
    await store.create({
      state: authorization.state,
      oidcNonce: authorization.oidcNonce,
      pkceVerifier: "pkce-verifier",
      action,
      actionDigest: authorization.actionDigest,
      createdAtMs: 1_800_000_000_000,
      maxAgeSeconds: 120,
    });
    const gateway = createWorldAuthorizationGateway<{
      transactionDigest: string;
      ignored: number;
    }>({
      config: {
        issuer: "https://sandbox.auth.world.org",
        clientId: "client-id",
        clientSecret: "server-secret",
        redirectUri: "https://coffer.example/api/world/callback",
        maxAgeSeconds: 120,
        appReturnUri: "https://app.example",
      },
      store,
      beginAuthorization: vi.fn(),
      verifyCallback: vi.fn(async () => verified),
      onVerified: vi.fn(async () => ({ transactionDigest: "0xticket", ignored: 42 })),
      redirectResult: (result) => ({ transaction_digest: result.transactionDigest }),
    });

    const response = await gateway.handle(
      request("/api/world/callback?state=world-state&code=valid-code"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://app.example/app/approvals?world_status=authorized&action_digest=abcd&transaction_digest=0xticket",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["cancelled", new AuthorizationCancelledError("raw cancellation")],
    ["expired", new AuthorizationExpiredError("raw expiry")],
    ["replayed", new AuthorizationReplayError("raw replay")],
    ["rejected", new AuthorizationValidationError("raw validation")],
  ])("redirects %s without running the protected action", async (status, callbackError) => {
    const store = new InMemoryAuthorizationStore();
    await store.create({
      state: authorization.state,
      oidcNonce: authorization.oidcNonce,
      pkceVerifier: "pkce-verifier",
      action,
      actionDigest: authorization.actionDigest,
      createdAtMs: 1_800_000_000_000,
      maxAgeSeconds: 120,
    });
    const onVerified = vi.fn();
    const gateway = createWorldAuthorizationGateway({
      config: {
        issuer: "https://sandbox.auth.world.org",
        clientId: "client-id",
        clientSecret: "server-secret",
        redirectUri: "https://coffer.example/api/world/callback",
        maxAgeSeconds: 120,
        appReturnUri: "https://app.example",
      },
      store,
      verifyCallback: vi.fn(async () => { throw callbackError; }),
      onVerified,
    });

    const response = await gateway.handle(
      request("/api/world/callback?state=world-state&code=callback-code"),
    );

    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin + location.pathname).toBe("https://app.example/app/approvals");
    expect(location.searchParams.get("world_status")).toBe(status);
    expect(location.search).not.toContain("raw");
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("preserves the JSON callback response when explicitly requested", async () => {
    const store = new InMemoryAuthorizationStore();
    await store.create({
      state: authorization.state,
      oidcNonce: authorization.oidcNonce,
      pkceVerifier: "pkce-verifier",
      action,
      actionDigest: authorization.actionDigest,
      createdAtMs: 1_800_000_000_000,
      maxAgeSeconds: 120,
    });
    const gateway = createWorldAuthorizationGateway({
      config: {
        issuer: "https://sandbox.auth.world.org",
        clientId: "client-id",
        clientSecret: "server-secret",
        redirectUri: "https://coffer.example/api/world/callback",
        maxAgeSeconds: 120,
        appReturnUri: "https://app.example",
      },
      store,
      verifyCallback: vi.fn(async () => verified),
      onVerified: vi.fn(async () => ({ transactionDigest: "0xticket" })),
    });

    const response = await gateway.handle(new Request(
      "http://localhost:3000/api/world/callback?state=world-state&code=valid-code",
      { headers: { accept: "application/json" } },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "authorized" });
  });
});
