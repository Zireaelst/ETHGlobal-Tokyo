export type ScheduledObligation = {
  id: string;
  amount: bigint;
  dueAtMs: number;
};

export type CashForecastInput = {
  currentBalance: bigint;
  nowMs: number;
  horizonEndMs: number;
  obligations: readonly ScheduledObligation[];
};

export type CashForecast = {
  totalObligations: bigint;
  shortfall: bigint;
  firstShortageAtMs: number | null;
  includedObligationIds: string[];
};

export function forecastShortfall(input: CashForecastInput): CashForecast {
  const included = input.obligations
    .filter(
      (obligation) =>
        obligation.dueAtMs >= input.nowMs &&
        obligation.dueAtMs <= input.horizonEndMs,
    )
    .sort(
      (left, right) =>
        left.dueAtMs - right.dueAtMs || left.id.localeCompare(right.id),
    );

  let runningTotal = 0n;
  let firstShortageAtMs: number | null = null;
  for (const obligation of included) {
    runningTotal += obligation.amount;
    if (firstShortageAtMs === null && runningTotal > input.currentBalance) {
      firstShortageAtMs = obligation.dueAtMs;
    }
  }

  return {
    totalObligations: runningTotal,
    shortfall:
      runningTotal > input.currentBalance
        ? runningTotal - input.currentBalance
        : 0n,
    firstShortageAtMs,
    includedObligationIds: included.map((obligation) => obligation.id),
  };
}
