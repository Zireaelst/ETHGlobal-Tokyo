import Link from "next/link";
import { RecentDemoEvidence } from "../../../components/demo/recent-demo-evidence";
import { LiveStatus } from "../../../components/ui/live-status";
import { TESTNET_DEPLOYMENT, suiScanTransactionUrl } from "../../../lib/deployment";
import styles from "../workspace.module.css";

const timeline = [
  ["12:02", "Request ingested", "Encrypted invoice reference registered from Walrus."],
  ["12:03", "Commercial context accessed", "Seal policy granted the agent minimum required document access."],
  ["12:03", "Policy evaluated", "Vendor, bucket liquidity, mandate window, and cap passed."],
  ["12:04", "Payment executed", "80 DEMO_USD moved from the Operating bucket on Sui testnet."],
  ["12:04", "Execution receipt recorded", "Decision inputs and transaction evidence linked for audit."],
] as const;

export default function AuditPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>OPERATIONS / AUDIT</p><h1>Decision receipts</h1><span>Trace policy inputs to an independently verifiable execution.</span></div>
        <LiveStatus />
      </header>
      <section className={styles.auditPanel}>
        <div className={styles.auditContext}><span>REQUEST</span><strong>REQ-2048 · Mirai Logistics</strong><small>Policy 3.2.1 · WITHIN_MANDATE</small></div>
        <ol aria-label="Decision to receipt timeline">
          {timeline.map(([time, title, detail], index) => <li key={title}><time>{time}</time><i>{String(index + 1).padStart(2, "0")}</i><div><strong>{title}</strong><span>{detail}</span></div></li>)}
        </ol>
        <Link className={styles.evidenceLink} href={suiScanTransactionUrl(TESTNET_DEPLOYMENT.agentDemo.executionDigest)} target="_blank">Verify execution on SuiScan <span aria-hidden="true">↗</span></Link>
      </section>
      <RecentDemoEvidence />
    </div>
  );
}
