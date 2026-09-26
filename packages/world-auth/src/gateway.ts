import {
  actionAuthorizationPayloadSchema,
  type ActionAuthorizationPayload,
} from "@coffer/shared-types";
import {
  AuthorizationCancelledError,
  AuthorizationExpiredError,
  AuthorizationReplayError,
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
  appReturnUri?: string;
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
  redirectResult?: (result: TResult) => Record<string, string>;
};

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

type CallbackStatus =
  | "authorized"
  | "cancelled"
  | "expired"
  | "replayed"
  | "rejected"
  | "failed";

function normalizeAppReturnUri(value: string | undefined): URL | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("World appReturnUri must be a valid absolute URL");
  }
  const secure = url.protocol === "https:";
  const localDevelopment = url.protocol === "http:" && url.hostname === "localhost";
  if ((!secure && !localDevelopment) || url.username || url.password) {
    throw new Error("World appReturnUri must use HTTPS except on localhost");
  }
  return new URL(url.origin);
}

function safeRedirectFields(fields: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (
      /^[a-z][a-z0-9_]{0,63}$/.test(key) &&
      key !== "world_status" &&
      key !== "action_digest" &&
      key !== "error_category" &&
      value.length <= 512
    ) {
      safe[key] = value;
    }
  }
  return safe;
}

function redirect(appReturnUri: URL, values: Record<string, string>): Response {
  const destination = new URL("/app/approvals", appReturnUri);
  for (const [key, value] of Object.entries(values)) {
    destination.searchParams.set(key, value);
  }
  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location: destination.toString(),
    },
  });
}

export function createWorldAuthorizationGateway<TResult>(
  options: WorldGatewayOptions<TResult>,
) {
  const beginAuthorization = options.beginAuthorization ?? beginFreshAuthorization;
  const verifyCallback = options.verifyCallback ?? verifyOidcCallback;
  const now = options.now ?? Date.now;
  const appReturnUri = normalizeAppReturnUri(options.config.appReturnUri);

  function callbackResponse(
    request: Request,
    status: CallbackStatus,
    body: unknown,
    httpStatus: number,
    extra: Record<string, string> = {},
  ): Response {
    const acceptsJson = request.headers.get("accept")?.includes("application/json") ?? false;
    if (!appReturnUri || acceptsJson) return json(body, httpStatus);
    return redirect(appReturnUri, {
      world_status: status,
      ...(status === "authorized" ? {} : { error_category: status }),
      ...extra,
    });
  }

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
          return callbackResponse(
            request,
            "rejected",
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
          return callbackResponse(
            request,
            "authorized",
            {
              status: "authorized",
              actionDigest: authorization.actionDigest,
              result,
            },
            200,
            {
              action_digest: authorization.actionDigest,
              ...safeRedirectFields(options.redirectResult?.(result) ?? {}),
            },
          );
        } catch (error) {
          if (error instanceof AuthorizationCancelledError) {
            return callbackResponse(
              request,
              "cancelled",
              { status: "cancelled", reason: error.message },
              400,
            );
          }
          if (error instanceof AuthorizationExpiredError) {
            return callbackResponse(
              request,
              "expired",
              { status: "expired", reason: error.message },
              400,
            );
          }
          if (error instanceof AuthorizationReplayError) {
            return callbackResponse(
              request,
              "replayed",
              { status: "replayed", reason: error.message },
              409,
            );
          }
          if (error instanceof AuthorizationValidationError) {
            return callbackResponse(
              request,
              "rejected",
              { status: "rejected", reason: error.message },
              400,
            );
          }
          return callbackResponse(
            request,
            "failed",
            { status: "failed", reason: "protected_action_failed" },
            500,
          );
        }
      }

      return json({ status: "not_found" }, 404);
    },
  };
}
