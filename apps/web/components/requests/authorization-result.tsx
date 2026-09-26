"use client";

import { useState } from "react";
import { suiScanTransactionUrl } from "../../lib/deployment";
import { parseWorldCallback } from "../../lib/world/client";
import { ExternalLink } from "../ui/external-link";
import styles from "./authorization.module.css";

const errorHeadings = {
  cancelled: "Authorization cancelled",
  expired: "Authorization expired",
  replayed: "Authorization already used",
  rejected: "Authorization rejected",
  failed: "Protected action failed",
} as const;

export function AuthorizationResult({
  query,
}: {
  query: Readonly<Record<string, string | undefined>>;
}) {
  const [visible, setVisible] = useState(true);
  const result = parseWorldCallback(query);
  if (!visible || result.status === "none") return null;

  function dismiss() {
    window.history.replaceState({}, "", window.location.pathname);
    setVisible(false);
  }

  if (result.status === "authorized") {
    return (
      <section aria-live="polite" className={`${styles.result} ${styles.success}`}>
        <div><span>WORLD CALLBACK</span><h2>Authorization verified and executed</h2></div>
        <p>World event identity is mocked; server validation and action binding are real.</p>
        <code>{result.transactionDigest}</code>
        <ExternalLink aria-label="Verify World-authorized transaction" href={suiScanTransactionUrl(result.transactionDigest)}>Verify transaction on SuiScan</ExternalLink>
        <button onClick={dismiss} type="button">Acknowledge result</button>
      </section>
    );
  }

  const heading = result.status === "invalid"
    ? "Invalid authorization result"
    : errorHeadings[result.status];
  return (
    <section aria-live="polite" className={`${styles.result} ${styles.nonSuccess}`}>
      <div><span>WORLD CALLBACK</span><h2>{heading}</h2></div>
      <strong>No balance change</strong>
      <p>The protected payment was not confirmed as executed. No success state is inferred from the browser alone.</p>
      <button onClick={dismiss} type="button">Dismiss result</button>
    </section>
  );
}
