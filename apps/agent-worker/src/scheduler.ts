import {
  forecastShortfall,
  type CashForecast,
  type ScheduledObligation,
} from "@coffer/policy-engine";
import type { JobStore } from "./job-store";

export type DueStandingOrder = {
  id: string;
  nextExecutionAtMs: number;
};

export type StandingOrderSchedulerDependencies = {
  jobs: JobStore;
  sui: {
    listDueStandingOrders(nowMs: number): Promise<DueStandingOrder[]>;
    executeStandingOrder(order: DueStandingOrder): Promise<string>;
  };
};

export async function runDueStandingOrders(
  nowMs: number,
  deps: StandingOrderSchedulerDependencies,
) {
  const orders = await deps.sui.listDueStandingOrders(nowMs);
  const results = [];
  for (const order of orders) {
    const result = await deps.jobs.once(
      `standing-order:${order.id}:${order.nextExecutionAtMs}`,
      async () => ({
        orderId: order.id,
        digest: await deps.sui.executeStandingOrder(order),
      }),
    );
    results.push(result);
  }
  return results;
}

export type ForecastDependencies = {
  readForecastInput(
    nowMs: number,
    horizonEndMs: number,
  ): Promise<{
    currentBalance: bigint;
    obligations: ScheduledObligation[];
  }>;
  writeForecast(forecast: CashForecast): Promise<void>;
};

export async function runForecast(
  nowMs: number,
  horizonEndMs: number,
  deps: ForecastDependencies,
): Promise<CashForecast> {
  const input = await deps.readForecastInput(nowMs, horizonEndMs);
  const forecast = forecastShortfall({
    ...input,
    nowMs,
    horizonEndMs,
  });
  await deps.writeForecast(forecast);
  return forecast;
}
