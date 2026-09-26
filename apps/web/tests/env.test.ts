import { describe, expect, it } from "vitest";
import { getPublicConfig } from "../lib/env";

describe("public browser configuration", () => {
  it("defaults to the official Sui testnet gRPC endpoint", () => {
    expect(getPublicConfig({})).toEqual({
      network: "testnet",
      grpcUrl: "https://fullnode.testnet.sui.io:443",
    });
  });

  it("enables Google only when both public Enoki values are present", () => {
    expect(getPublicConfig({ NEXT_PUBLIC_ENOKI_API_KEY: "public-key" })).not.toHaveProperty("enoki");
    expect(getPublicConfig({ NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-id" })).not.toHaveProperty("enoki");
    expect(getPublicConfig({
      NEXT_PUBLIC_ENOKI_API_KEY: "public-key",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-id",
    })).toMatchObject({ enoki: { apiKey: "public-key", googleClientId: "google-id" } });
  });

  it("never exposes signer or secret-shaped configuration", () => {
    const serialized = JSON.stringify(getPublicConfig({
      NEXT_PUBLIC_ENOKI_API_KEY: "public-key",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-id",
      COFFER_EXECUTOR_PRIVATE_KEY: "must-not-escape",
      WORLD_CLIENT_SECRET: "must-not-escape",
    }));

    expect(serialized).not.toMatch(/secret|privateKey|signer|must-not-escape/i);
  });
});
