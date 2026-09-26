import { InstitutionalTable } from "../../../components/ui/institutional-table";
import { ReadOnlyNotice } from "../../../components/ui/read-only-notice";
import { DEMO_POLICIES } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

export default function PoliciesPage() {
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><p>INSTITUTIONAL / POLICIES</p><h1>Policy registry</h1><span>Versioned rules that constrain delegated financial authority.</span></div></header>
    <ReadOnlyNotice />
    <InstitutionalTable caption="ACTIVE POLICY SET" columns={["Policy", "Version", "Status", "Autonomous cap"]} rows={DEMO_POLICIES.map((policy) => [policy.name, policy.version, policy.status, `${Number(policy.autonomousLimitBaseUnits) / 1_000_000} DEMO_USD`])} />
  </div>;
}
