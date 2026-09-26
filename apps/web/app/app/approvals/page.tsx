import Link from "next/link";
import { DataSourceBadge } from "../../../components/ui/data-source-badge";
import { DEMO_REQUESTS } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

export default function ApprovalsPage() {
  const completed = DEMO_REQUESTS.find((request) => request.outcome === "human_authorization");

  if (!completed) throw new Error("The demo workspace requires a completed authorization.");

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>OPERATIONS / APPROVALS</p><h1>Approval queue</h1><span>Fresh human authorization for material agent actions.</span></div>
        <DataSourceBadge source="verified" />
      </header>

      <div className={styles.splitWorkspace}>
        <section aria-label="Pending approvals" className={styles.queuePanel}>
          <div className={styles.sectionHeading}><div><p>PENDING / 01</p><h2>Awaiting a fresh human decision</h2></div><DataSourceBadge source="demo" /></div>
          <article className={styles.approvalCard}>
            <div><span>REQ-2062</span><strong>Hikari Compute</strong></div>
            <dl>
              <div><dt>Requested</dt><dd>420 DEMO_USD</dd></div>
              <div><dt>Reason</dt><dd>Above autonomous cap</dd></div>
              <div><dt>Protected action</dt><dd>Payment execution</dd></div>
            </dl>
            <p>No transaction can be signed until World returns a fresh, backend-validated authorization.</p>
          </article>
        </section>

        <section aria-label="Completed approvals" className={styles.queuePanel}>
          <div className={styles.sectionHeading}><div><p>COMPLETED / 01</p><h2>World-authorized testnet execution</h2></div><DataSourceBadge source="verified" /></div>
          <article className={styles.approvalCard}>
            <div><span>{completed.id}</span><strong>{completed.vendor}</strong></div>
            <dl>
              <div><dt>Amount</dt><dd>300 DEMO_USD</dd></div>
              <div><dt>Authorization</dt><dd>Fresh human approval</dd></div>
              <div><dt>Result</dt><dd>Executed on Sui testnet</dd></div>
            </dl>
            <Link href={`/app/requests?request=${completed.id}`}>Inspect evidence <span aria-hidden="true">→</span></Link>
          </article>
        </section>
      </div>
    </div>
  );
}
