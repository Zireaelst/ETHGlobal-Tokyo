import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "node:crypto";

export interface JobStore {
  once<T>(jobKey: string, task: () => Promise<T>): Promise<T>;
}

export class MemoryJobStore implements JobStore {
  readonly #jobs = new Map<string, Promise<unknown>>();

  async once<T>(jobKey: string, task: () => Promise<T>): Promise<T> {
    const existing = this.#jobs.get(jobKey);
    if (existing) {
      return existing as Promise<T>;
    }

    const pending = task().catch((error: unknown) => {
      this.#jobs.delete(jobKey);
      throw error;
    });
    this.#jobs.set(jobKey, pending);
    return pending;
  }
}

export type LibsqlJobStoreOptions = {
  url?: string;
  authToken?: string;
  leaseMs?: number;
  pollMs?: number;
};

export class LibsqlJobStore implements JobStore {
  readonly #client: Client;
  readonly #leaseMs: number;
  readonly #pollMs: number;
  readonly #ready: Promise<void>;

  constructor(options: LibsqlJobStoreOptions = {}) {
    const authToken = options.authToken ?? process.env.LIBSQL_AUTH_TOKEN;
    this.#client = createClient({
      url: options.url ?? process.env.LIBSQL_URL ?? "file:./coffer-worker.db",
      ...(authToken ? { authToken } : {}),
    });
    this.#leaseMs = options.leaseMs ?? 300_000;
    this.#pollMs = options.pollMs ?? 50;
    this.#ready = this.#initialize();
  }

  async #initialize() {
    await this.#client.execute(`
      CREATE TABLE IF NOT EXISTS worker_jobs (
        job_key TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        result_json TEXT,
        owner_id TEXT NOT NULL,
        lease_expires_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  async once<T>(jobKey: string, task: () => Promise<T>): Promise<T> {
    await this.#ready;
    const ownerId = randomUUID();

    for (;;) {
      const now = Date.now();
      const inserted = await this.#client.execute({
        sql: `
          INSERT OR IGNORE INTO worker_jobs
            (job_key, state, result_json, owner_id, lease_expires_at, updated_at)
          VALUES (?, 'RUNNING', NULL, ?, ?, ?)
        `,
        args: [jobKey, ownerId, now + this.#leaseMs, now],
      });

      let claimed = inserted.rowsAffected === 1;
      if (!claimed) {
        const reclaimed = await this.#client.execute({
          sql: `
            UPDATE worker_jobs
            SET owner_id = ?, lease_expires_at = ?, updated_at = ?
            WHERE job_key = ? AND state = 'RUNNING' AND lease_expires_at < ?
          `,
          args: [ownerId, now + this.#leaseMs, now, jobKey, now],
        });
        claimed = reclaimed.rowsAffected === 1;
      }

      if (claimed) {
        try {
          const result = await task();
          await this.#client.execute({
            sql: `
              UPDATE worker_jobs
              SET state = 'COMPLETED', result_json = ?, updated_at = ?
              WHERE job_key = ? AND owner_id = ?
            `,
            args: [JSON.stringify(result), Date.now(), jobKey, ownerId],
          });
          return result;
        } catch (error) {
          await this.#client.execute({
            sql: "DELETE FROM worker_jobs WHERE job_key = ? AND owner_id = ?",
            args: [jobKey, ownerId],
          });
          throw error;
        }
      }

      const existing = await this.#client.execute({
        sql: "SELECT state, result_json FROM worker_jobs WHERE job_key = ?",
        args: [jobKey],
      });
      const row = existing.rows[0];
      if (row?.state === "COMPLETED" && typeof row.result_json === "string") {
        return JSON.parse(row.result_json) as T;
      }
      await new Promise((resolve) => setTimeout(resolve, this.#pollMs));
    }
  }

  close() {
    this.#client.close();
  }
}
