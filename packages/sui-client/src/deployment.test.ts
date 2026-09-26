import { describe, expect, it } from "vitest";
import {
  createdObjectsFromResult,
  parseMoveBuildOutput,
  requireCreatedObject,
} from "./deployment";

describe("deployment helpers", () => {
  it("extracts the final base64 build payload after compiler logs", () => {
    const payload = parseMoveBuildOutput(
      'INCLUDING DEPENDENCY Sui\nBUILDING coffer\n{"modules":["AA=="],"dependencies":["0x1"],"digest":[1,2]}\n',
    );
    expect(payload).toEqual({
      modules: ["AA=="],
      dependencies: ["0x1"],
      digest: [1, 2],
    });
  });

  it("maps only newly created objects to their onchain types", () => {
    const objects = createdObjectsFromResult({
      effects: {
        changedObjects: [
          { objectId: "0x1", idOperation: "Created", outputState: "PackageWrite" },
          { objectId: "0x2", idOperation: "Created", outputState: "ObjectWrite" },
          { objectId: "0x3", idOperation: "None", outputState: "ObjectWrite" },
        ],
      },
      objectTypes: {
        "0x2": "0x2::coin::TreasuryCap<0x1::demo_usd::DEMO_USD>",
      },
    });
    expect(objects).toEqual([
      { objectId: "0x1", type: "package" },
      {
        objectId: "0x2",
        type: "0x2::coin::TreasuryCap<0x1::demo_usd::DEMO_USD>",
      },
    ]);
    expect(requireCreatedObject(objects, (object) => object.type === "package")).toBe("0x1");
  });

  it("fails loudly when a required deployment object is absent", () => {
    expect(() => requireCreatedObject([], () => true, "Treasury")).toThrow(
      "Treasury was not created",
    );
  });
});
