import { RequestWorkspace } from "../../../components/requests/request-workspace";
import { DataSourceBadge } from "../../../components/ui/data-source-badge";
import styles from "../workspace.module.css";

type RequestsPageProps = {
  searchParams: Promise<{ request?: string }>;
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const selectedId = (await searchParams).request;

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
      <RequestWorkspace selectedId={selectedId} />
    </div>
  );
}
