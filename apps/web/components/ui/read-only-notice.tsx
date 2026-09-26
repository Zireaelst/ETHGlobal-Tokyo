import { DataSourceBadge } from "./data-source-badge";
import styles from "./read-only-notice.module.css";

export function ReadOnlyNotice() {
  return (
    <aside aria-label="Workspace data status" className={styles.notice}>
      <DataSourceBadge source="demo" />
      <div>
        <strong>Read-only in this build</strong>
        <span>Representative institutional records support the end-to-end demo.</span>
      </div>
    </aside>
  );
}
