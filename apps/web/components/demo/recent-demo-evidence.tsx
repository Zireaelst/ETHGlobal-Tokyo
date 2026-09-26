"use client";

import { suiScanTransactionUrl } from "../../lib/deployment";
import { runsToAuditEvents } from "../../lib/demo/session";
import { useOptionalDemoSession } from "./demo-session-provider";
import styles from "./recent-demo-evidence.module.css";

export function RecentDemoEvidence() {
  const session = useOptionalDemoSession();
  const events = runsToAuditEvents(session?.runs ?? []);
  if (!events.length) return null;

  return (
    <section aria-label="Current demo session evidence" className={styles.evidence}>
      <header><span>CURRENT DEMO SESSION</span><strong>Agent decisions added from Overview</strong></header>
      <ol>
        {events.map((event) => (
          <li key={event.id}>
            <time>{new Date(event.occurredAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
            <div><strong>{event.action}</strong><span>{event.requestId} · {event.dataSource === "live" ? "Fresh testnet run" : "Guided replay"}</span></div>
            {event.transactionDigest ? <a href={suiScanTransactionUrl(event.transactionDigest)} rel="noreferrer" target="_blank">Receipt ↗</a> : <span>No payment tx</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
