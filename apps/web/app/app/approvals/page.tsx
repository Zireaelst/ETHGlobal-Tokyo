import Link from "next/link";
import { AuthorizationResult } from "../../../components/requests/authorization-result";
import { WorldAuthorizationButton } from "../../../components/requests/world-authorization-button";
import { DataSourceBadge } from "../../../components/ui/data-source-badge";
import { DEMO_REQUESTS } from "../../../lib/demo/fixtures";
import { TESTNET_DEPLOYMENT } from "../../../lib/deployment";
import styles from "../workspace.module.css";

type ApprovalsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps = {}) {
  const completed = DEMO_REQUESTS.find((request) => request.outcome === "human_authorization");
  const rawQuery = searchParams ? await searchParams : {};
  const query = Object.fromEntries(
    Object.entries(rawQuery).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const pending = TESTNET_DEPLOYMENT.pendingWorldDemo;

  if (!completed) throw new Error("The demo workspace requires a completed authorization.");

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>OPERATIONS / APPROVALS</p><h1>Approval queue</h1><span>Fresh human authorization for material agent actions.</span></div>
        <DataSourceBadge source="verified" />
      </header>

      <AuthorizationResult query={query} />

      <div className={styles.splitWorkspace}>
        <section aria-label="Pending approvals" className={styles.queuePanel}>
          <div className={styles.sectionHeading}><div><p>PENDING / 01</p><h2>Awaiting a fresh human decision</h2></div><DataSourceBadge source="demo" /></div>
          <article className={styles.approvalCard}>
            <div><span>{pending.action.paymentRequestId.slice(0, 10)}…</span><strong>Tokyo Cloud Ltd.</strong></div>
            <dl>
              <div><dt>Requested</dt><dd>420 DEMO_USD</dd></div>
              <div><dt>Reason</dt><dd>Above autonomous cap</dd></div>
              <div><dt>Protected action</dt><dd>Payment execution</dd></div>
            </dl>
            <p>No transaction can be signed until World returns a fresh, backend-validated authorization.</p>
            <WorldAuthorizationButton action={pending.action} />
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
            <p>Historical evidence only. This completed action cannot be authorized or executed again.</p>
            <Link href={`/app/requests?request=${completed.id}`}>Inspect evidence <span aria-hidden="true">→</span></Link>
          </article>
        </section>
      </div>
    </div>
  );
}
