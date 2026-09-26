import {
  actionAuthorizationPayloadSchema,
  type ActionAuthorizationPayload,
} from "@coffer/shared-types";
import {
  AuthorizationCancelledError,
  AuthorizationValidationError,
  beginFreshAuthorization,
  verifyOidcCallback,
  type AuthorizationRequest,
  type AuthorizationStore,
  type BeginFreshAuthorizationInput,
  type VerifiedAuthorization,
  type VerifyOidcCallbackInput,
} from "./verifier";

export type WorldGatewayConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  maxAgeSeconds: number;
};

export type WorldGatewayOptions<TResult> = {
  config: WorldGatewayConfig;
  store: AuthorizationStore;
  onVerified: (
    authorization: VerifiedAuthorization,
    action: ActionAuthorizationPayload,
  ) => Promise<TResult>;
  now?: () => number;
  fetch?: typeof fetch;
  beginAuthorization?: (
    input: BeginFreshAuthorizationInput,
  ) => Promise<AuthorizationRequest>;
  verifyCallback?: (
    input: VerifyOidcCallbackInput,
  ) => Promise<VerifiedAuthorization>;
};

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createWorldAuthorizationGateway<TResult>(
  options: WorldGatewayOptions<TResult>,
) {
  const beginAuthorization = options.beginAuthorization ?? beginFreshAuthorization;
  const verifyCallback = options.verifyCallback ?? verifyOidcCallback;
  const now = options.now ?? Date.now;

  return {
    async handle(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/health") {
        return json({ status: "ok" });
      }

      if (request.method === "POST" && url.pathname === "/api/world/authorize") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ status: "invalid_request", reason: "invalid_json" }, 400);
        }
        const parsed = actionAuthorizationPayloadSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            {
              status: "invalid_request",
              reason: "invalid_action",
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            },
            400,
          );
        }

        try {
          const authorization = await beginAuthorization({
            issuer: options.config.issuer,
            clientId: options.config.clientId,
            redirectUri: options.config.redirectUri,
            maxAgeSeconds: options.config.maxAgeSeconds,
            nowMs: now(),
            store: options.store,
            ...(options.fetch ? { fetch: options.fetch } : {}),
            action: parsed.data,
          });
          return json(authorization);
        } catch (error) {
          return json(
            {
              status: "authorization_not_started",
              reason: error instanceof Error ? error.message : "unknown_error",
            },
            400,
          );
        }
      }

      if (request.method === "GET" && url.pathname === "/api/world/callback") {
        const state = url.searchParams.get("state") ?? "";
        const pending = state ? await options.store.get(state) : null;
        if (!pending) {
          return json(
            { status: "invalid_callback", reason: "unknown_or_missing_state" },
            400,
          );
        }

        try {
          const code = url.searchParams.get("code");
          const callbackError = url.searchParams.get("error");
          const authorization = await verifyCallback({
            issuer: options.config.issuer,
            clientId: options.config.clientId,
            clientSecret: options.config.clientSecret,
            redirectUri: options.config.redirectUri,
            maxAgeSeconds: options.config.maxAgeSeconds,
            nowMs: now(),
            store: options.store,
            ...(options.fetch ? { fetch: options.fetch } : {}),
            state,
            ...(code ? { code } : {}),
            ...(callbackError ? { error: callbackError } : {}),
            expectedAction: pending.action,
          });
          const result = await options.onVerified(authorization, pending.action);
          return json({
            status: "authorized",
            actionDigest: authorization.actionDigest,
            result,
          });
        } catch (error) {
          if (error instanceof AuthorizationCancelledError) {
            return json({ status: "cancelled", reason: error.message }, 400);
          }
          if (error instanceof AuthorizationValidationError) {
            return json({ status: "rejected", reason: error.message }, 400);
          }
          return json({ status: "failed", reason: "protected_action_failed" }, 500);
        }
      }

      return json({ status: "not_found" }, 404);
    },
  };
}
