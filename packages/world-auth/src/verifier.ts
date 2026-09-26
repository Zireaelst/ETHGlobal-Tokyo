import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { canonicalActionDigestHex } from "./canonical-action";

export class AuthorizationValidationError extends Error {
  override readonly name = "AuthorizationValidationError";
}

export class AuthorizationCancelledError extends Error {
  override readonly name = "AuthorizationCancelledError";
}

export class AuthorizationReplayError extends Error {
  override readonly name = "AuthorizationReplayError";
}

type OidcMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
};

export type PendingAuthorization = {
  state: string;
  oidcNonce: string;
  pkceVerifier: string;
  action: ActionAuthorizationPayload;
  actionDigest: string;
  createdAtMs: number;
  maxAgeSeconds: number;
};

export interface AuthorizationStore {
  create(pending: PendingAuthorization): Promise<void>;
  get(state: string): Promise<PendingAuthorization | null>;
  consume(state: string, actionNonce: string): Promise<boolean>;
}

export class InMemoryAuthorizationStore implements AuthorizationStore {
  readonly #pending = new Map<string, PendingAuthorization>();
  readonly #usedActionNonces = new Set<string>();

  async create(pending: PendingAuthorization): Promise<void> {
    if (this.#pending.has(pending.state)) {
      throw new AuthorizationReplayError("OIDC state already exists");
    }
    this.#pending.set(pending.state, structuredClone(pending));
  }

  async get(state: string): Promise<PendingAuthorization | null> {
    const pending = this.#pending.get(state);
    return pending ? structuredClone(pending) : null;
  }

  async consume(state: string, actionNonce: string): Promise<boolean> {
    const pending = this.#pending.get(state);
    if (!pending || this.#usedActionNonces.has(actionNonce)) return false;
    this.#pending.delete(state);
    this.#usedActionNonces.add(actionNonce);
    return true;
  }
}

type CommonInput = {
  issuer: string;
  clientId: string;
  redirectUri: string;
  maxAgeSeconds: number;
  nowMs: number;
  store: AuthorizationStore;
  fetch?: typeof fetch;
};

export type BeginFreshAuthorizationInput = CommonInput & {
  action: ActionAuthorizationPayload;
};

export type AuthorizationRequest = {
  authorizationUrl: string;
  state: string;
  oidcNonce: string;
  actionDigest: string;
};

export type VerifyOidcCallbackInput = CommonInput & {
  clientSecret: string;
  state: string;
  code?: string;
  error?: string;
  expectedAction: ActionAuthorizationPayload;
  expectedSubject?: string;
};

export type VerifiedAuthorization = {
  issuer: string;
  subject: string;
  authTime: number;
  actionDigest: string;
  actionNonce: string;
};

function base64url(input: Uint8Array): string {
  return Buffer.from(input).toString("base64url");
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new AuthorizationValidationError(`${label} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function discover(issuer: string, fetcher: typeof fetch): Promise<OidcMetadata> {
  const base = issuer.endsWith("/") ? issuer.slice(0, -1) : issuer;
  const metadata = await readJson<OidcMetadata>(
    await fetcher(`${base}/.well-known/openid-configuration`),
    "OIDC discovery",
  );
  if (
    metadata.issuer !== issuer ||
    !metadata.authorization_endpoint ||
    !metadata.token_endpoint ||
    !metadata.jwks_uri
  ) {
    throw new AuthorizationValidationError("OIDC discovery metadata is invalid");
  }
  return metadata;
}

export async function beginFreshAuthorization(
  input: BeginFreshAuthorizationInput,
): Promise<AuthorizationRequest> {
  if (input.maxAgeSeconds < 1 || input.maxAgeSeconds > 300) {
    throw new AuthorizationValidationError("World authorization max_age is out of bounds");
  }
  if (input.action.expiresAtMs <= input.nowMs) {
    throw new AuthorizationValidationError("The protected action has already expired");
  }
  const fetcher = input.fetch ?? fetch;
  const metadata = await discover(input.issuer, fetcher);
  const state = base64url(randomBytes(32));
  const oidcNonce = base64url(randomBytes(32));
  const pkceVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(
    createHash("sha256").update(pkceVerifier).digest(),
  );
  const actionDigest = canonicalActionDigestHex(input.action);
  await input.store.create({
    state,
    oidcNonce,
    pkceVerifier,
    action: structuredClone(input.action),
    actionDigest,
    createdAtMs: input.nowMs,
    maxAgeSeconds: input.maxAgeSeconds,
  });

  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", oidcNonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("max_age", String(input.maxAgeSeconds));
  return { authorizationUrl: url.toString(), state, oidcNonce, actionDigest };
}

function equalDigest(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return (
    leftBytes.byteLength === rightBytes.byteLength &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export async function verifyOidcCallback(
  input: VerifyOidcCallbackInput,
): Promise<VerifiedAuthorization> {
  if (input.error) {
    throw new AuthorizationCancelledError(`World authorization failed: ${input.error}`);
  }
  if (!input.code) {
    throw new AuthorizationValidationError("OIDC callback is missing an authorization code");
  }

  const pending = await input.store.get(input.state);
  if (!pending) {
    throw new AuthorizationValidationError("OIDC state is unknown or already consumed");
  }
  if (input.nowMs - pending.createdAtMs > 5 * 60_000) {
    throw new AuthorizationValidationError("OIDC authorization request expired");
  }
  if (pending.maxAgeSeconds !== input.maxAgeSeconds) {
    throw new AuthorizationValidationError("OIDC freshness policy changed during authorization");
  }
  if (input.expectedAction.expiresAtMs <= input.nowMs) {
    throw new AuthorizationValidationError("The protected action expired before authorization");
  }
  const expectedDigest = canonicalActionDigestHex(input.expectedAction);
  if (!equalDigest(pending.actionDigest, expectedDigest)) {
    throw new AuthorizationValidationError("Authorized action does not match the pending action");
  }

  try {
    const fetcher = input.fetch ?? fetch;
    const metadata = await discover(input.issuer, fetcher);
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: pending.pkceVerifier,
    });
    const clientCredentials = Buffer.from(
      `${encodeURIComponent(input.clientId)}:${encodeURIComponent(input.clientSecret)}`,
    ).toString("base64");
    const tokenResponse = await readJson<{ id_token?: string }>(
      await fetcher(metadata.token_endpoint, {
        method: "POST",
        headers: {
          authorization: `Basic ${clientCredentials}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: tokenBody,
      }),
      "OIDC token endpoint",
    );
    if (!tokenResponse.id_token) {
      throw new AuthorizationValidationError("OIDC token response has no ID token");
    }
    const jwks = await readJson<JSONWebKeySet>(
      await fetcher(metadata.jwks_uri),
      "OIDC JWKS endpoint",
    );
    const { payload } = await jwtVerify(
      tokenResponse.id_token,
      createLocalJWKSet(jwks),
      {
        issuer: input.issuer,
        audience: input.clientId,
        currentDate: new Date(input.nowMs),
        clockTolerance: 5,
      },
    );
    if (!payload.sub) {
      throw new AuthorizationValidationError("World ID token has no pairwise subject");
    }
    if (payload.nonce !== pending.oidcNonce) {
      throw new AuthorizationValidationError("World ID token nonce does not match");
    }
    if (typeof payload.auth_time !== "number") {
      throw new AuthorizationValidationError("World ID token has no auth_time");
    }
    const nowSeconds = Math.floor(input.nowMs / 1_000);
    if (
      payload.auth_time > nowSeconds + 5 ||
      nowSeconds - payload.auth_time > input.maxAgeSeconds + 5
    ) {
      throw new AuthorizationValidationError("World authentication is not fresh");
    }
    if (input.expectedSubject && payload.sub !== input.expectedSubject) {
      throw new AuthorizationValidationError("World pairwise subject does not match");
    }
    if (!(await input.store.consume(input.state, input.expectedAction.nonce))) {
      throw new AuthorizationReplayError("World action nonce has already been used");
    }
    return {
      issuer: input.issuer,
      subject: payload.sub,
      authTime: payload.auth_time,
      actionDigest: expectedDigest,
      actionNonce: input.expectedAction.nonce,
    };
  } catch (error) {
    if (
      error instanceof AuthorizationValidationError ||
      error instanceof AuthorizationReplayError
    ) {
      throw error;
    }
    throw new AuthorizationValidationError(
      `World ID token validation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
