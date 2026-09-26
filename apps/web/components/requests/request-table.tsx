import Link from "next/link";
import type { PaymentRequestRecord } from "../../lib/requests/model";
import { DataSourceBadge } from "../ui/data-source-badge";
import styles from "./requests.module.css";

function displayAmount(baseUnits: string) {
  return `${Number(baseUnits) / 1_000_000} DEMO_USD`;
}

export function RequestTable({ requests }: { requests: readonly PaymentRequestRecord[] }) {
  return (
    <div className={styles.tableFrame}>
      <table>
        <thead>
          <tr>
            <th scope="col">Request</th>
            <th scope="col">Vendor</th>
            <th scope="col">Amount</th>
            <th scope="col">Bucket</th>
            <th scope="col">Outcome</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td><Link href={`/app/requests?request=${request.id}`}>{request.id}</Link></td>
              <td>{request.vendor}</td>
              <td>{displayAmount(request.amountBaseUnits)}</td>
              <td>{request.sourceBucket}</td>
              <td><span data-outcome={request.outcome}>{request.status.replaceAll("_", " ")}</span></td>
              <td><DataSourceBadge source={request.dataSource} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
