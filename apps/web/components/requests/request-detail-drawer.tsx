"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { suiScanTransactionUrl } from "../../lib/deployment";
import type { PaymentRequestRecord } from "../../lib/requests/model";
import { ExternalLink } from "../ui/external-link";
import { DataSourceBadge } from "../ui/data-source-badge";
import { OutcomeState } from "./outcome-state";
import { PolicyCheckList } from "./policy-check-list";
import styles from "./requests.module.css";

function displayAmount(baseUnits: string) {
  return `${Number(baseUnits) / 1_000_000} DEMO_USD`;
}

export function RequestDetailDrawer({ request }: { request: PaymentRequestRecord }) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const drawer = drawerRef.current;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    drawer?.addEventListener("keydown", trapFocus);
    return () => {
      drawer?.removeEventListener("keydown", trapFocus);
      previous?.focus();
    };
  }, []);

  return (
    <div className={styles.drawerBackdrop}>
      <aside
        aria-label={`Payment request ${request.id}`}
        aria-modal="true"
        className={styles.drawer}
        ref={drawerRef}
        role="dialog"
      >
        <header className={styles.drawerHeader}>
          <div>
            <p>PAYMENT REQUEST</p>
            <h2>{request.id}</h2>
          </div>
          <Link aria-label="Close payment request" href="/app/requests" ref={closeRef}>×</Link>
        </header>

        <OutcomeState request={request} />

        <section className={styles.requestSummary}>
          <dl>
            <div><dt>Vendor</dt><dd>{request.vendor}</dd></div>
            <div><dt>Amount</dt><dd>{displayAmount(request.amountBaseUnits)}</dd></div>
            <div><dt>Source bucket</dt><dd>{request.sourceBucket}</dd></div>
            <div><dt>Due</dt><dd>{new Date(request.dueAt).toLocaleDateString("en-GB")}</dd></div>
          </dl>
          <DataSourceBadge source={request.dataSource} />
        </section>

        <section className={styles.documentSection}>
          <div className={styles.drawerSectionHeading}>
            <span>ENCRYPTED COMMERCIAL DOCUMENT</span>
            <span>{Math.round(request.extractionConfidence * 100)}%</span>
          </div>
          <strong>{request.document.displayName}</strong>
          <p>Seal access: {request.document.accessState.replaceAll("_", " ")} · Walrus ciphertext {request.document.blobId.slice(0, 10)}…</p>
        </section>

        <section>
          <div className={styles.drawerSectionHeading}><span>POLICY EVALUATION</span></div>
          <PolicyCheckList checks={request.checks} />
        </section>

        <section className={styles.executionSection}>
          <div className={styles.drawerSectionHeading}><span>EXECUTION</span></div>
          {request.transactionDigest ? (
            <>
              {request.outcome === "human_authorization" ? (
                <strong>Historical World authorization · already executed</strong>
              ) : null}
              <code>{request.transactionDigest}</code>
              <ExternalLink
                aria-label="Open transaction in SuiScan"
                href={suiScanTransactionUrl(request.transactionDigest)}
              >
                Open transaction in SuiScan
              </ExternalLink>
            </>
          ) : (
            <div className={styles.noTransaction}>
              <strong>No transaction submitted</strong>
              <span>Policy stopped execution before signing.</span>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
