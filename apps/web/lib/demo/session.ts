import { DEMO_REQUESTS, TREASURY_BUCKETS } from "./fixtures";
import type { AgentOutcome, PaymentRequestRecord } from "../requests/model";

export type DemoMode = "replay" | "live";
export type DemoScenario = AgentOutcome;

export type DemoRun = {
  id: string;
  requestId: string;
  mode: DemoMode;
  scenario: DemoScenario;
  completedAt: string;
  amountBaseUnits: string;
  sourceBucket: PaymentRequestRecord["sourceBucket"];
  vendor: string;
  executionDigest?: string;
  submitDigest?: string;
};

type BuildDemoRunInput = {
  mode: DemoMode;
  scenario: DemoScenario;
  completedAt?: string;
  executionDigest?: string;
  submitDigest?: string;
  requestId?: string;
  amountBaseUnits?: string;
  sourceBucket?: PaymentRequestRecord["sourceBucket"];
  vendor?: string;
};

const scenarioTemplate: Record<DemoScenario, PaymentRequestRecord> = {
  auto_execute: DEMO_REQUESTS[0]!,
  human_authorization: DEMO_REQUESTS[1]!,
  hold: DEMO_REQUESTS[2]!,
  reject: DEMO_REQUESTS[3]!,
};

export function buildDemoRun(input: BuildDemoRunInput): DemoRun {
  const template = scenarioTemplate[input.scenario];
  const completedAt = input.completedAt ?? new Date().toISOString();
  const suffix = completedAt.replace(/\D/g, "").slice(-8);
  return {
    id: `run-${suffix}-${input.scenario}`,
    requestId: input.requestId ?? `REQ-${suffix}`,
    mode: input.mode,
    scenario: input.scenario,
    completedAt,
    amountBaseUnits: input.amountBaseUnits ?? template.amountBaseUnits,
    sourceBucket: input.sourceBucket ?? template.sourceBucket,
    vendor: input.vendor ?? template.vendor,
    ...(input.executionDigest ? { executionDigest: input.executionDigest } : {}),
    ...(input.submitDigest ? { submitDigest: input.submitDigest } : {}),
  };
}

export function runsToRequests(runs: readonly DemoRun[]): PaymentRequestRecord[] {
  return [...runs].reverse().map((run) => {
    const template = scenarioTemplate[run.scenario];
    const projected: PaymentRequestRecord = {
      ...template,
      id: run.requestId,
      createdAt: run.completedAt,
      dueAt: run.completedAt,
      dataSource: run.mode === "live" ? "live" : "verified",
    };
    if (run.executionDigest) projected.transactionDigest = run.executionDigest;
    else delete projected.transactionDigest;
    return projected;
  });
}

export function applyRunsToBuckets(runs: readonly DemoRun[]) {
  return TREASURY_BUCKETS.map((bucket) => {
    const spent = runs
      .filter(
        (run) =>
          run.sourceBucket === bucket.name &&
          (run.scenario === "auto_execute" || run.scenario === "human_authorization"),
      )
      .reduce((total, run) => total + BigInt(run.amountBaseUnits), 0n);
    return {
      ...bucket,
      balanceBaseUnits: (BigInt(bucket.balanceBaseUnits) - spent).toString(),
    };
  });
}

export function runsToAuditEvents(runs: readonly DemoRun[]) {
  const labels: Record<DemoScenario, string> = {
    auto_execute: "Executed within mandate",
    human_authorization: "Escalated for fresh human authorization",
    hold: "Held before signing",
    reject: "Rejected by treasury policy",
  };
  return [...runs].reverse().map((run) => ({
    id: `audit-${run.id}`,
    occurredAt: run.completedAt,
    actor: "Treasury agent",
    action: labels[run.scenario],
    requestId: run.requestId,
    dataSource: run.mode === "live" ? ("live" as const) : ("verified" as const),
    transactionDigest: run.executionDigest,
  }));
}
