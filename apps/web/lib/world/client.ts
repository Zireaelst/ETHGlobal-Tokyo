import {
  actionAuthorizationPayloadSchema,
  type ActionAuthorizationPayload,
} from "@coffer/shared-types";

const actionDigestPattern = /^[a-f0-9]{64}$/;
const transactionDigestPattern = /^[1-9A-HJ-NP-Za-km-z]{32,64}$/;

export type WorldCallbackResult =
  | { status: "none" }
  | { status: "authorized"; actionDigest: string; transactionDigest: string }
  | { status: "cancelled" | "expired" | "replayed" | "rejected" | "failed" }
  | { status: "invalid" };

function worldGatewayOrigin(): string {
  const value = process.env.NEXT_PUBLIC_WORLD_GATEWAY_URL?.trim();
  if (!value) throw new Error("World gateway is not configured.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("World gateway URL must be a valid absolute URL.");
  }
  const secure = url.protocol === "https:";
  const local = url.protocol === "http:" && url.hostname === "localhost";
  if ((!secure && !local) || url.username || url.password) {
    throw new Error("World gateway URL must use HTTPS except on localhost.");
  }
  return url.origin;
}

export async function beginWorldAuthorization(
  action: ActionAuthorizationPayload,
  fetcher: typeof fetch = fetch,
): Promise<{ authorizationUrl: string; actionDigest: string }> {
  const canonicalAction = actionAuthorizationPayloadSchema.parse(action);
  const response = await fetcher(`${worldGatewayOrigin()}/api/world/authorize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(canonicalAction),
  });
  if (!response.ok) throw new Error("World authorization could not be started.");

  const value = await response.json() as Record<string, unknown>;
  if (
    typeof value.authorizationUrl !== "string" ||
    typeof value.actionDigest !== "string" ||
    !actionDigestPattern.test(value.actionDigest)
  ) {
    throw new Error("World authorization response is malformed.");
  }
  const authorizationUrl = new URL(value.authorizationUrl);
  if (authorizationUrl.protocol !== "https:") {
    throw new Error("World authorization response is malformed.");
  }
  return { authorizationUrl: authorizationUrl.toString(), actionDigest: value.actionDigest };
}

export function parseWorldCallback(
  query: Readonly<Record<string, string | undefined>>,
): WorldCallbackResult {
  const status = query.world_status;
  if (!status) return { status: "none" };
  if (status === "authorized") {
    return query.action_digest &&
      query.transaction_digest &&
      actionDigestPattern.test(query.action_digest) &&
      transactionDigestPattern.test(query.transaction_digest)
      ? {
          status,
          actionDigest: query.action_digest,
          transactionDigest: query.transaction_digest,
        }
      : { status: "invalid" };
  }
  return ["cancelled", "expired", "replayed", "rejected", "failed"].includes(status)
    ? { status: status as Exclude<WorldCallbackResult["status"], "none" | "authorized" | "invalid"> }
    : { status: "invalid" };
}
