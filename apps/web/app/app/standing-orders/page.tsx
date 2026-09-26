import { DataSourceBadge } from "../../../components/ui/data-source-badge";
import { DEMO_STANDING_ORDERS } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

function formatNextRun(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).formatToParts(new Date(value));
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = Number(valueOf("month")) - 1;
  const month = months[monthIndex];

  if (!month) throw new Error(`Invalid standing-order date: ${value}`);

  return `${valueOf("day")} ${month} ${valueOf("year")}, ${valueOf("hour")}:${valueOf("minute")} JST`;
}

export default function StandingOrdersPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>OPERATIONS / STANDING ORDERS</p><h1>Payment schedule</h1><span>Obligations the agent evaluates over time without repeated prompting.</span></div>
        <DataSourceBadge source="demo" />
      </header>
      <section aria-label="Active standing orders" className={styles.schedulePanel}>
        {DEMO_STANDING_ORDERS.map((order) => (
          <article key={order.id}>
            <div className={styles.scheduleDate}><span>NEXT RUN</span><strong>{formatNextRun(order.nextRunAt)}</strong></div>
            <div><span>VENDOR</span><strong>{order.vendor}</strong><small>{order.cadence}</small></div>
            <div><span>AMOUNT</span><strong>{Number(order.amountBaseUnits) / 1_000_000} DEMO_USD</strong><small>{order.bucket}</small></div>
            <em>{order.status}</em>
          </article>
        ))}
      </section>
      <aside className={styles.forecastBand}><span>FORWARD CHECK</span><strong>The agent forecasts bucket liquidity before the next run.</strong><p>A schedule creates an obligation, not an unconditional transfer: the policy is evaluated again at execution time.</p></aside>
    </div>
  );
}
