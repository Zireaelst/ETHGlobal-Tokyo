import { describe, expect, it } from "vitest";
import {
  applyRunsToBuckets,
  buildDemoRun,
  runsToAuditEvents,
  runsToRequests,
} from "../lib/demo/session";

describe("agent demo session projections", () => {
  it("propagates an executed live run to balances, requests, and audit", () => {
    const run = buildDemoRun({
      mode: "live",
      scenario: "auto_execute",
      completedAt: "2026-09-27T01:00:00.000Z",
      executionDigest: "fresh-execution-digest",
      submitDigest: "fresh-submit-digest",
    });

    expect(applyRunsToBuckets([run]).find((bucket) => bucket.name === "Operating"))
      .toMatchObject({ balanceBaseUnits: "540000000" });
    expect(runsToRequests([run])[0]).toMatchObject({
      id: run.requestId,
      dataSource: "live",
      status: "executed",
      transactionDigest: "fresh-execution-digest",
    });
    expect(runsToAuditEvents([run])[0]).toMatchObject({
      requestId: run.requestId,
      action: "Executed within mandate",
    });
  });

  it("does not move capital when policy holds a request", () => {
    const run = buildDemoRun({
      mode: "replay",
      scenario: "hold",
      completedAt: "2026-09-27T01:00:00.000Z",
    });

    expect(applyRunsToBuckets([run]).find((bucket) => bucket.name === "Reserve"))
      .toMatchObject({ balanceBaseUnits: "1250000000" });
    expect(runsToRequests([run])[0]).toMatchObject({ status: "held" });
  });
});
