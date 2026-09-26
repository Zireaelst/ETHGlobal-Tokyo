import type { PolicyCheck } from "../../lib/requests/model";
import styles from "./requests.module.css";

export function PolicyCheckList({ checks }: { checks: readonly PolicyCheck[] }) {
  return (
    <ul className={styles.checks}>
      {checks.map((check) => (
        <li data-result={check.result} key={check.code}>
          <span aria-hidden="true">{check.result === "pass" ? "✓" : check.result === "fail" ? "×" : "!"}</span>
          <div>
            <strong>{check.label}</strong>
            <p>{check.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
