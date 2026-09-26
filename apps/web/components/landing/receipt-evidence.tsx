import { TESTNET_DEPLOYMENT, suiScanTransactionUrl } from "../../lib/deployment";
import { ExternalLink } from "../ui/external-link";
import styles from "./editorial-story.module.css";

function compactDigest(digest: string) {
  return `${digest.slice(0, 8)}…${digest.slice(-6)}`;
}

export function ReceiptEvidence() {
  return (
    <div className={styles.receiptEvidence}>
      <div className={styles.receiptHeader}>
        <span>VERIFIED TESTNET RUNS</span>
        <span>02 RECEIPTS</span>
      </div>
      <dl>
        <div>
          <dt>Autonomous payment</dt>
          <dd>{compactDigest(TESTNET_DEPLOYMENT.agentDemo.executionDigest)}</dd>
        </div>
        <div>
          <dt>World-authorized payment</dt>
          <dd>{compactDigest(TESTNET_DEPLOYMENT.worldDemo.executionDigest)}</dd>
        </div>
        <div>
          <dt>Treasury object</dt>
          <dd>{compactDigest(TESTNET_DEPLOYMENT.treasuryId)}</dd>
        </div>
      </dl>
      <div className={styles.receiptLinks}>
        <ExternalLink
          aria-label="View autonomous payment"
          href={suiScanTransactionUrl(TESTNET_DEPLOYMENT.agentDemo.executionDigest)}
        >
          Auto execution
        </ExternalLink>
        <ExternalLink
          aria-label="View World-authorized payment"
          href={suiScanTransactionUrl(TESTNET_DEPLOYMENT.worldDemo.executionDigest)}
        >
          Protected execution
        </ExternalLink>
      </div>
    </div>
  );
}
