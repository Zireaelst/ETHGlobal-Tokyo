import { InstitutionalTable } from "../../../components/ui/institutional-table";
import { ReadOnlyNotice } from "../../../components/ui/read-only-notice";
import { DEMO_USERS } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

export default function UsersPage() {
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><p>INSTITUTIONAL / USERS</p><h1>Users and roles</h1><span>Human responsibility around an autonomous treasury.</span></div></header>
    <ReadOnlyNotice />
    <InstitutionalTable caption="WORKSPACE ACCESS" columns={["User", "Role", "Access", "Authentication"]} rows={DEMO_USERS.map((user) => [user.name, user.role, user.access, "Not connected"])} />
  </div>;
}
