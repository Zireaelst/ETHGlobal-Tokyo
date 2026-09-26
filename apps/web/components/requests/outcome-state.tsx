import type { PaymentRequestRecord } from "../../lib/requests/model";
import styles from "./requests.module.css";

const outcomeCopy = {
  auto_execute: ["AUTO EXECUTED", "Within mandate"],
  hold: ["HELD", "Needs treasury attention"],
  reject: ["REJECTED", "Policy boundary enforced"],
  human_authorization: ["HUMAN AUTHORIZED", "Exception approved"],
} as const;

export function OutcomeState({ request }: { request: PaymentRequestRecord }) {
  const [label, description] = outcomeCopy[request.outcome];
  return (
    <div className={styles.outcome} data-outcome={request.outcome}>
      <span>{label}</span>
      <strong>{description}</strong>
      <code>{request.reasonCode}</code>
    </div>
  );
}
