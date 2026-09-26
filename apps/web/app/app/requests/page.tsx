import { RequestDetailDrawer } from "../../../components/requests/request-detail-drawer";
import { RequestTable } from "../../../components/requests/request-table";
import { DataSourceBadge } from "../../../components/ui/data-source-badge";
import { DEMO_REQUESTS } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

type RequestsPageProps = {
  searchParams: Promise<{ request?: string }>;
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const selectedId = (await searchParams).request;
  const selected = DEMO_REQUESTS.find((request) => request.id === selectedId);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>OPERATIONS / REQUESTS</p>
          <h1>Payment requests</h1>
          <span>Every request ends in one explicit, policy-derived outcome.</span>
        </div>
        <DataSourceBadge source="verified" />
      </header>
      <RequestTable requests={DEMO_REQUESTS} />
      {selected ? <RequestDetailDrawer request={selected} /> : null}
    </div>
  );
}
