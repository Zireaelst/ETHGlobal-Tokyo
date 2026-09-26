"use client";

import { useEffect, useState } from "react";
import type { TreasurySnapshot } from "../../lib/sui/live-treasury";
import styles from "./live-status.module.css";

type Status = "checking" | TreasurySnapshot["source"];

export function LiveStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/treasury", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Treasury status request failed.");
        return response.json() as Promise<TreasurySnapshot>;
      })
      .then((snapshot) => setStatus(snapshot.source))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("verified");
      });
    return () => controller.abort();
  }, []);

  return (
    <span className={styles.status} data-status={status}>
      <i aria-hidden="true" />
      {status === "live"
        ? "Live testnet"
        : status === "verified"
          ? "Verified testnet run · RPC unavailable"
          : "Checking Sui testnet"}
    </span>
  );
}
