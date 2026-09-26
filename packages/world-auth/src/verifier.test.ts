import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JWK,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { canonicalActionDigestHex } from "./canonical-action";
import {
  AuthorizationCancelledError,
  AuthorizationReplayError,
  AuthorizationValidationError,
  InMemoryAuthorizationStore,
  beginFreshAuthorization,
  verifyOidcCallback,
} from "./verifier";

const ISSUER = "https://sandbox.auth.world.org";
const CLIENT_ID = "coffer-test-client";
const REDIRECT_URI = "http://localhost:3000/api/world/callback";
const NOW_MS = 1_800_000_000_000;

const action: ActionAuthorizationPayload = {
  treasuryId: "0xtreasury",
  paymentRequestId: "0xrequest",
  vendor: "0xvendor",
  amount: "240",
  expiresAtMs: NOW_MS + 120_000,
  nonce: "action-nonce-00000001",
};

let privateKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: "world-test-key" };
});

async function idToken(
  nonce: string,
  overrides: Record<string, unknown> = {},
  signingKey = privateKey,
) {
  const {
    iss = ISSUER,
    aud = CLIENT_ID,
    exp = Math.floor(NOW_MS / 1_000) + 300,
    iat = Math.floor(NOW_MS / 1_000) - 5,
    ...payloadOverrides
  } = overrides;
  return new SignJWT({
    sub: "pairwise-world-subject",
    nonce,
    auth_time: Math.floor(NOW_MS / 1_000) - 5,
    ...payloadOverrides,
  })
    .setProtectedHeader({ alg: "RS256", kid: "world-test-key" })
    .setIssuer(String(iss))
    .setAudience(aud as string | string[])
    .setIssuedAt(Number(iat))
    .setExpirationTime(Number(exp))
    .sign(signingKey);
}

function oidcFetch(getToken: () => Promise<string>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = input.toString();
    if (url.endsWith("/.well-known/openid-configuration")) {
      return Response.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: `${ISSUER}/jwks`,
      });
    }
    if (url === `${ISSUER}/token`) {
      return Response.json({ id_token: await getToken(), token_type: "Bearer" });
    }
    if (url === `${ISSUER}/jwks`) {
      return Response.json({ keys: [publicJwk] });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

async function begin(store: InMemoryAuthorizationStore) {
  return beginFreshAuthorization({
    issuer: ISSUER,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    action,
    maxAgeSeconds: 60,
    nowMs: NOW_MS,
    store,
    fetch: oidcFetch(async () => "unused"),
  });
}

describe("World action authorization", () => {
  it("canonicalizes the exact action deterministically", () => {
    expect(canonicalActionDigestHex(action)).toBe(canonicalActionDigestHex({ ...action }));
    expect(canonicalActionDigestHex({ ...action, amount: "241" })).not.toBe(
      canonicalActionDigestHex(action),
    );
  });

  it("requests fresh OIDC authentication with PKCE, state, and nonce", async () => {
    const request = await begin(new InMemoryAuthorizationStore());
    const url = new URL(request.authorizationUrl);
    expect(url.searchParams.get("max_age")).toBe("60");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(request.state);
    expect(url.searchParams.get("nonce")).toBe(request.oidcNonce);
  });

  it("validates a fresh signed callback and binds it to the action", async () => {
    const store = new InMemoryAuthorizationStore();
    const request = await begin(store);
    const verified = await verifyOidcCallback({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: "server-only-secret",
      redirectUri: REDIRECT_URI,
      state: request.state,
      code: "valid-code",
      expectedAction: action,
      maxAgeSeconds: 60,
      nowMs: NOW_MS,
      store,
      fetch: oidcFetch(() => idToken(request.oidcNonce)),
    });

    expect(verified).toMatchObject({
      issuer: ISSUER,
      subject: "pairwise-world-subject",
      actionDigest: canonicalActionDigestHex(action),
    });
  });

  it("surfaces user cancellation without authorizing", async () => {
    const store = new InMemoryAuthorizationStore();
    const request = await begin(store);
    await expect(
      verifyOidcCallback({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        clientSecret: "secret",
        redirectUri: REDIRECT_URI,
        state: request.state,
        error: "access_denied",
        expectedAction: action,
        maxAgeSeconds: 60,
        nowMs: NOW_MS,
        store,
        fetch: oidcFetch(async () => "unused"),
      }),
    ).rejects.toBeInstanceOf(AuthorizationCancelledError);
  });

  it.each([
    ["expired token", { exp: Math.floor(NOW_MS / 1_000) - 10 }],
    ["wrong issuer", { iss: "https://attacker.example" }],
    ["wrong audience", { aud: "another-client" }],
    ["stale authentication", { auth_time: Math.floor(NOW_MS / 1_000) - 120 }],
    ["wrong OIDC nonce", { nonce: "wrong-nonce" }],
  ])("rejects %s", async (_name, claims) => {
    const store = new InMemoryAuthorizationStore();
    const request = await begin(store);
    await expect(
      verifyOidcCallback({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        clientSecret: "secret",
        redirectUri: REDIRECT_URI,
        state: request.state,
        code: "invalid-code",
        expectedAction: action,
        maxAgeSeconds: 60,
        nowMs: NOW_MS,
        store,
        fetch: oidcFetch(() => idToken(request.oidcNonce, claims)),
      }),
    ).rejects.toBeInstanceOf(AuthorizationValidationError);
  });

  it("rejects a token signed by an untrusted key", async () => {
    const store = new InMemoryAuthorizationStore();
    const request = await begin(store);
    const attacker = await generateKeyPair("RS256");
    await expect(
      verifyOidcCallback({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        clientSecret: "secret",
        redirectUri: REDIRECT_URI,
        state: request.state,
        code: "invalid-signature",
        expectedAction: action,
        maxAgeSeconds: 60,
        nowMs: NOW_MS,
        store,
        fetch: oidcFetch(() => idToken(request.oidcNonce, {}, attacker.privateKey)),
      }),
    ).rejects.toBeInstanceOf(AuthorizationValidationError);
  });

  it("rejects unknown state and a changed pending action", async () => {
    const store = new InMemoryAuthorizationStore();
    const request = await begin(store);
    const base = {
      issuer: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: "secret",
      redirectUri: REDIRECT_URI,
      code: "code",
      maxAgeSeconds: 60,
      nowMs: NOW_MS,
      store,
      fetch: oidcFetch(() => idToken(request.oidcNonce)),
    };
    await expect(
      verifyOidcCallback({
        ...base,
        state: "unknown-state",
        expectedAction: action,
      }),
    ).rejects.toBeInstanceOf(AuthorizationValidationError);
    await expect(
      verifyOidcCallback({
        ...base,
        state: request.state,
        expectedAction: { ...action, amount: "999" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationValidationError);
  });

  it("atomically rejects reuse of an action nonce", async () => {
    const store = new InMemoryAuthorizationStore();
    const first = await begin(store);
    const second = await begin(store);
    const verify = (state: string, nonce: string) =>
      verifyOidcCallback({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        clientSecret: "secret",
        redirectUri: REDIRECT_URI,
        state,
        code: "code",
        expectedAction: action,
        maxAgeSeconds: 60,
        nowMs: NOW_MS,
        store,
        fetch: oidcFetch(() => idToken(nonce)),
      });

    await expect(verify(first.state, first.oidcNonce)).resolves.toBeDefined();
    await expect(verify(second.state, second.oidcNonce)).rejects.toBeInstanceOf(
      AuthorizationReplayError,
    );
  });
});
