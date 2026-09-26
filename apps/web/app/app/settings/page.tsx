import { ReadOnlyNotice } from "../../../components/ui/read-only-notice";
import styles from "../workspace.module.css";

const settings = [
  ["Workspace", "Tokyo Operations Treasury"],
  ["Network", "Sui Testnet"],
  ["Settlement asset", "DEMO_USD"],
  ["Commercial storage", "Walrus ciphertext"],
  ["Document access", "Seal policy"],
  ["Material-action authorization", "World ID for Agents sandbox"],
] as const;

export default function SettingsPage() {
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><p>INSTITUTIONAL / SETTINGS</p><h1>Workspace settings</h1><span>Configured rails and trust boundaries for this treasury.</span></div></header>
    <ReadOnlyNotice />
    <dl className={styles.settingsList}>{settings.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}</dl>
  </div>;
}
