import { InstitutionalTable } from "../../../components/ui/institutional-table";
import { ReadOnlyNotice } from "../../../components/ui/read-only-notice";
import { DEMO_VENDORS } from "../../../lib/demo/fixtures";
import styles from "../workspace.module.css";

export default function VendorsPage() {
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><p>INSTITUTIONAL / VENDORS</p><h1>Vendor registry</h1><span>Counterparties available to policy evaluation.</span></div></header>
    <ReadOnlyNotice />
    <InstitutionalTable caption="APPROVED COUNTERPARTIES" columns={["Vendor", "Category", "Status", "Monthly committed"]} rows={DEMO_VENDORS.map((vendor) => [vendor.name, vendor.category, vendor.status, `${Number(vendor.monthlyCommittedBaseUnits) / 1_000_000} DEMO_USD`])} />
  </div>;
}
