import { describe, expect, it, vi } from "vitest";
import { MemoryJobStore } from "./job-store";
import { runDueStandingOrders, runForecast } from "./scheduler";

describe("treasury scheduler", () => {
  it("submits every indexed due order and leaves timing enforcement to Move", async () => {
    const executeStandingOrder = vi.fn().mockResolvedValue("digest-1");
    const result = await runDueStandingOrders(5_000, {
      jobs: new MemoryJobStore(),
      sui: {
        listDueStandingOrders: vi.fn().mockResolvedValue([
          { id: "order-1", nextExecutionAtMs: 4_000 },
          { id: "order-2", nextExecutionAtMs: 5_000 },
        ]),
        executeStandingOrder,
      },
    });

    expect(result).toEqual([
      { orderId: "order-1", digest: "digest-1" },
      { orderId: "order-2", digest: "digest-1" },
    ]);
    expect(executeStandingOrder).toHaveBeenCalledTimes(2);
  });

  it("does not replay the same scheduled occurrence", async () => {
    const jobs = new MemoryJobStore();
    const executeStandingOrder = vi.fn().mockResolvedValue("digest-1");
    const deps = {
      jobs,
      sui: {
        listDueStandingOrders: vi
          .fn()
          .mockResolvedValue([{ id: "order-1", nextExecutionAtMs: 4_000 }]),
        executeStandingOrder,
      },
    };

    await runDueStandingOrders(5_000, deps);
    await runDueStandingOrders(5_000, deps);
    expect(executeStandingOrder).toHaveBeenCalledTimes(1);
  });

  it("writes a structured proactive shortfall forecast", async () => {
    const writeForecast = vi.fn().mockResolvedValue(undefined);
    const result = await runForecast(1_000, 10_000, {
      readForecastInput: vi.fn().mockResolvedValue({
        currentBalance: 100n,
        obligations: [
          { id: "vendor-a", amount: 60n, dueAtMs: 2_000 },
          { id: "vendor-b", amount: 70n, dueAtMs: 3_000 },
        ],
      }),
      writeForecast,
    });

    expect(result).toEqual({
      totalObligations: 130n,
      shortfall: 30n,
      firstShortageAtMs: 3_000,
      includedObligationIds: ["vendor-a", "vendor-b"],
    });
    expect(writeForecast).toHaveBeenCalledWith(result);
  });
});
