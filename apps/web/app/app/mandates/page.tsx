import { DataSourceBadge } from "../../../components/ui/data-source-badge";
import { DEMO_VENDORS } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

export default function MandatesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>OPERATIONS / MANDATES</p><h1>Agent mandate</h1><span>Delegated authority expressed as enforceable boundaries.</span></div>
        <DataSourceBadge source="demo" />
      </header>

      <section className={styles.mandateHero}>
        <div><span>AUTONOMOUS PAYMENT CAP</span><strong>250 DEMO_USD</strong><p>Per action · Operating and Vendor committed buckets</p></div>
        <div className={styles.statusStamp}><span>REVOCATION STATUS</span><strong>Not revoked</strong><small>Mandate remains active</small></div>
      </section>

      <section className={styles.policyGrid}>
        <article><span>POLICY VERSION</span><strong>Policy 3.2.1</strong><p>Every decision receipt records the evaluated version.</p></article>
        <article><span>EXPIRY</span><strong>30 Sep 2026, 23:59 JST</strong><p>Authority expires even if the agent process remains online.</p></article>
        <article><span>HUMAN THRESHOLD</span><strong>Above 250 DEMO_USD</strong><p>Material payments require action-bound World authorization.</p></article>
      </section>

      <section className={styles.registryPanel}>
        <div className={styles.sectionHeading}><div><p>COUNTERPARTY SCOPE</p><h2>Approved vendors</h2></div></div>
        <ul className={styles.compactList}>
          {DEMO_VENDORS.map((vendor) => <li key={vendor.id}><strong>{vendor.name}</strong><span>{vendor.category}</span><em>{vendor.status}</em></li>)}
        </ul>
      </section>
    </div>
  );
}
