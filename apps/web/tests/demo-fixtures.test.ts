import { describe, expect, it } from "vitest";
import {
  DEMO_AUDIT_EVENTS,
  DEMO_DOCUMENTS,
  DEMO_POLICIES,
  DEMO_REQUESTS,
  DEMO_STANDING_ORDERS,
  DEMO_USERS,
  DEMO_VENDORS,
  TREASURY_BUCKETS,
} from "../lib/demo/fixtures";
import { TESTNET_DEPLOYMENT } from "../lib/deployment";

describe("Coffer demo workspace fixtures", () => {
  it("contains one coherent request for every agent outcome", () => {
    expect(new Set(DEMO_REQUESTS.map((request) => request.outcome))).toEqual(
      new Set(["auto_execute", "hold", "reject", "human_authorization"]),
    );

    for (const request of DEMO_REQUESTS) {
      const mayHaveExecution =
        request.outcome === "auto_execute" ||
        (request.outcome === "human_authorization" && request.status === "executed");
      expect(Boolean(request.transactionDigest)).toBe(mayHaveExecution);
      expect(["live", "verified", "demo"]).toContain(request.dataSource);
      expect(request.document.encrypted).toBe(true);
      expect(request.document.storage).toBe("seal-walrus");
    }
  });

  it("binds verified records to committed testnet evidence", () => {
    const autonomous = DEMO_REQUESTS.find((request) => request.outcome === "auto_execute");
    const protectedRequest = DEMO_REQUESTS.find(
      (request) => request.outcome === "human_authorization",
    );

    expect(autonomous).toMatchObject({
      amountBaseUnits: "80000000",
      dataSource: "verified",
      transactionDigest: TESTNET_DEPLOYMENT.agentDemo.executionDigest,
    });
    expect(protectedRequest).toMatchObject({
      amountBaseUnits: "300000000",
      actionDigest: TESTNET_DEPLOYMENT.worldDemo.actionDigest,
      dataSource: "verified",
      transactionDigest: TESTNET_DEPLOYMENT.worldDemo.executionDigest,
    });
  });

  it("keeps held and rejected requests non-executing with stable reasons", () => {
    for (const request of DEMO_REQUESTS.filter(
      (item) => item.outcome === "hold" || item.outcome === "reject",
    )) {
      expect(request.reasonCode).toMatch(/^[A-Z][A-Z0-9_]+$/);
      expect(request.transactionDigest).toBeUndefined();
      expect(request.status).not.toBe("executed");
    }
  });

  it("populates all three buckets and institutional modules", () => {
    expect(TREASURY_BUCKETS.map((bucket) => bucket.name)).toEqual([
      "Operating",
      "Reserve",
      "Vendor committed",
    ]);
    for (const collection of [
      DEMO_VENDORS,
      DEMO_DOCUMENTS,
      DEMO_POLICIES,
      DEMO_USERS,
      DEMO_STANDING_ORDERS,
      DEMO_AUDIT_EVENTS,
    ]) {
      expect(collection.length).toBeGreaterThan(0);
      expect(collection.every((record) => record.dataSource === "demo")).toBe(true);
    }
  });
});
