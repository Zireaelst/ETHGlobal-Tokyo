import Link from "next/link";
import { DataSourceBadge } from "../../../components/ui/data-source-badge";
import {
  DEMO_AUDIT_EVENTS,
  DEMO_REQUESTS,
  DEMO_STANDING_ORDERS,
  TREASURY_BUCKETS,
} from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

function amount(baseUnits: string) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Number(baseUnits) / 1_000_000,
  );
}

export default function OverviewPage() {
  const nextOrder = DEMO_STANDING_ORDERS[0];

  if (!nextOrder) {
    throw new Error("The demo workspace requires at least one standing order.");
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>OPERATIONS / OVERVIEW</p>
          <h1>Treasury overview</h1>
          <span>Policy-bound capital, obligations, and agent activity.</span>
        </div>
        <DataSourceBadge source="verified" />
      </header>

      <section aria-label="Treasury buckets" className={styles.bucketGrid}>
        {TREASURY_BUCKETS.map((bucket, index) => (
          <article key={bucket.name}>
            <div className={styles.cardMeta}>
              <span>0{index + 1}</span>
              <DataSourceBadge source={index === 0 ? "verified" : "demo"} />
            </div>
            <h2>{bucket.name}</h2>
            <strong>{amount(bucket.balanceBaseUnits)} DEMO_USD</strong>
            <p>{bucket.policy}</p>
          </article>
        ))}
      </section>

      <section className={styles.signalGrid}>
        <article className={styles.mandateCard}>
          <div className={styles.cardMeta}>
            <span>MANDATE HEADROOM</span>
            <DataSourceBadge source="demo" />
          </div>
          <strong>170 DEMO_USD autonomous headroom</strong>
          <p>250 limit minus the largest scheduled autonomous obligation.</p>
          <Link href="/app/mandates">Inspect mandate <span aria-hidden="true">→</span></Link>
        </article>

        <article className={styles.orderCard}>
          <div className={styles.cardMeta}>
            <span>NEXT OBLIGATION</span>
            <DataSourceBadge source="demo" />
          </div>
          <strong>{nextOrder.vendor} · {amount(nextOrder.amountBaseUnits)} DEMO_USD</strong>
          <p>Runs 29 Sep from {nextOrder.bucket}.</p>
          <Link href="/app/standing-orders">View schedule <span aria-hidden="true">→</span></Link>
        </article>

        <article className={styles.warningCard}>
          <div className={styles.cardMeta}>
            <span>PROACTIVE FORECAST</span>
            <DataSourceBadge source="demo" />
          </div>
          <strong>Reserve floor at risk on 30 Sep after the next committed obligation.</strong>
          <p>The agent held REQ-2054 before a payment attempt was submitted.</p>
          <Link href="/app/requests?request=REQ-2054">Review held request <span aria-hidden="true">→</span></Link>
        </article>
      </section>

      <section className={styles.activitySection}>
        <div className={styles.sectionHeading}>
          <div>
            <p>AGENT LOG</p>
            <h2>Recent agent actions</h2>
          </div>
          <Link href="/app/audit">Full audit trail <span aria-hidden="true">→</span></Link>
        </div>
        <ol>
          {DEMO_AUDIT_EVENTS.map((event) => {
            const request = DEMO_REQUESTS.find((item) => item.id === event.requestId);
            return (
              <li key={event.id}>
                <time dateTime={event.occurredAt}>
                  {new Date(event.occurredAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Tokyo",
                  })}
                </time>
                <div>
                  <strong>{event.action}</strong>
                  <span>{event.actor} · {event.requestId}</span>
                </div>
                <DataSourceBadge source={request?.dataSource ?? "demo"} />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
