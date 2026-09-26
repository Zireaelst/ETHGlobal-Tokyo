import { InstitutionalTable } from "../../../components/ui/institutional-table";
import { ReadOnlyNotice } from "../../../components/ui/read-only-notice";
import { DEMO_DOCUMENTS } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

export default function DocumentsPage() {
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><p>INSTITUTIONAL / DOCUMENTS</p><h1>Commercial documents</h1><span>Encrypted context references; not confidential transaction amounts.</span></div></header>
    <ReadOnlyNotice />
    <InstitutionalTable caption="SEAL + WALRUS DOCUMENT INDEX" columns={["Document", "Storage", "Access", "Disclosure"]} rows={DEMO_DOCUMENTS.map((document) => [document.name, document.storage, document.access, "Metadata only"])} />
  </div>;
}
