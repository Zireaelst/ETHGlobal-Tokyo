import { describe, expect, it } from "vitest";
import { forecastShortfall } from "./forecast";

describe("forecastShortfall", () => {
  it("returns the first date on which scheduled obligations exceed cash", () => {
    const result = forecastShortfall({
      currentBalance: 100n,
      nowMs: 1_000,
      horizonEndMs: 10_000,
      obligations: [
        { id: "vendor-a-1", amount: 40n, dueAtMs: 2_000 },
        { id: "vendor-b-1", amount: 70n, dueAtMs: 3_000 },
        { id: "outside-horizon", amount: 500n, dueAtMs: 11_000 },
      ],
    });

    expect(result).toEqual({
      totalObligations: 110n,
      shortfall: 10n,
      firstShortageAtMs: 3_000,
      includedObligationIds: ["vendor-a-1", "vendor-b-1"],
    });
  });

  it("reports no shortfall when the bucket covers the horizon", () => {
    expect(
      forecastShortfall({
        currentBalance: 200n,
        nowMs: 1_000,
        horizonEndMs: 10_000,
        obligations: [{ id: "vendor-a-1", amount: 40n, dueAtMs: 2_000 }],
      }),
    ).toMatchObject({ shortfall: 0n, firstShortageAtMs: null });
  });

  it("sorts obligations deterministically and ignores past entries", () => {
    expect(
      forecastShortfall({
        currentBalance: 50n,
        nowMs: 1_000,
        horizonEndMs: 10_000,
        obligations: [
          { id: "later", amount: 30n, dueAtMs: 3_000 },
          { id: "past", amount: 1_000n, dueAtMs: 999 },
          { id: "earlier", amount: 30n, dueAtMs: 2_000 },
        ],
      }),
    ).toEqual({
      totalObligations: 60n,
      shortfall: 10n,
      firstShortageAtMs: 3_000,
      includedObligationIds: ["earlier", "later"],
    });
  });
});
