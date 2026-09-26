import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibsqlJobStore } from "./job-store";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("LibsqlJobStore", () => {
  it("executes a job once across two worker instances", async () => {
    const directory = await mkdtemp(join(tmpdir(), "coffer-job-store-"));
    temporaryDirectories.push(directory);
    const url = `file:${join(directory, "jobs.db")}`;
    const firstStore = new LibsqlJobStore({ url, pollMs: 5 });
    const secondStore = new LibsqlJobStore({ url, pollMs: 5 });
    const effect = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { decision: "AUTO_EXECUTE" };
    });

    try {
      const results = await Promise.all([
        firstStore.once("payment:1", effect),
        secondStore.once("payment:1", effect),
      ]);
      expect(results).toEqual([
        { decision: "AUTO_EXECUTE" },
        { decision: "AUTO_EXECUTE" },
      ]);
      expect(effect).toHaveBeenCalledTimes(1);
    } finally {
      firstStore.close();
      secondStore.close();
    }
  });
});
