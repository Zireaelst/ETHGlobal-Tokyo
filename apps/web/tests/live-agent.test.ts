import { describe, expect, it } from "vitest";
import { getLiveAgentConfig } from "../lib/demo/live-agent";

describe("live agent configuration", () => {
  it("stays disabled unless explicitly enabled", () => {
    expect(() => getLiveAgentConfig({})).toThrow("Live testnet demo is not enabled");
  });

  it("requires a server-only Sui signer key", () => {
    expect(() => getLiveAgentConfig({ COFFER_LIVE_DEMO_ENABLED: "true" })).toThrow(
      "COFFER_TESTNET_PRIVATE_KEY",
    );
  });

  it("accepts the two private server settings", () => {
    expect(getLiveAgentConfig({
      COFFER_LIVE_DEMO_ENABLED: "true",
      COFFER_TESTNET_PRIVATE_KEY: "suiprivkey-test",
    })).toEqual({ privateKey: "suiprivkey-test" });
  });
});
