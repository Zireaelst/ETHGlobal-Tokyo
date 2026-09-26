import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { beginWorldAuthorization } from "../lib/world/client";

const action: ActionAuthorizationPayload = {
  treasuryId: "0xtreasury",
  paymentRequestId: "0xrequest",
  vendor: "0xvendor",
  amount: "420000000",
  expiresAtMs: 1_800_000_120_000,
  nonce: "action-nonce-00000001",
};

const digest = "a".repeat(64);

describe("World gateway browser client", () => {
  afterEach(() => delete process.env.NEXT_PUBLIC_WORLD_GATEWAY_URL);

  it("posts the exact canonical action to the configured gateway", async () => {
    process.env.NEXT_PUBLIC_WORLD_GATEWAY_URL = "https://gateway.example";
    const fetcher = vi.fn(async () => Response.json({
      authorizationUrl: "https://sandbox.auth.world.org/api/v1/authorize?state=fresh",
      actionDigest: digest,
    }));

    await expect(beginWorldAuthorization(action, fetcher as typeof fetch)).resolves.toEqual({
      authorizationUrl: "https://sandbox.auth.world.org/api/v1/authorize?state=fresh",
      actionDigest: digest,
    });
    expect(fetcher).toHaveBeenCalledWith("https://gateway.example/api/world/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action),
    });
  });

  it("rejects unsafe gateway origins and malformed responses", async () => {
    process.env.NEXT_PUBLIC_WORLD_GATEWAY_URL = "http://gateway.example";
    await expect(beginWorldAuthorization(action, vi.fn() as typeof fetch)).rejects.toThrow(/HTTPS/i);

    process.env.NEXT_PUBLIC_WORLD_GATEWAY_URL = "https://gateway.example";
    const malformed = vi.fn(async () => Response.json({
      status: "authorized",
      transactionDigest: "client-claimed-success",
    }));
    await expect(beginWorldAuthorization(action, malformed as typeof fetch)).rejects.toThrow(
      /authorization response/i,
    );
  });
});
