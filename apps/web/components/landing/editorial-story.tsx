import Image from "next/image";
import Link from "next/link";
import { IntegrationMark } from "./integration-mark";
import { ReceiptEvidence } from "./receipt-evidence";
import styles from "./editorial-story.module.css";

const authorizationSteps = [
  ["01", "Request evaluated by agent"],
  ["02", "Fresh human authorization (World)"],
  ["03", "Approval bound to one exact action"],
  ["04", "Policy-enforced execution on Sui"],
] as const;

const protocols = [
  ["Sui", "S", "Onchain treasury and Move enforcement"],
  ["World", "W", "Fresh human authorization for exceptions"],
  ["Seal", "◇", "Encrypted commercial context"],
  ["Walrus", "≋", "Decentralized ciphertext storage"],
] as const;

export function EditorialStory() {
  return (
    <div className={styles.story}>
      <section className={styles.mandate} id="how-it-works">
        <div className={styles.copy}>
          <p className={styles.sectionNumber}>01 / MANDATES</p>
          <h2>Give agents a mandate — not a wallet.</h2>
          <p>
            Set enforceable spending caps, approved counterparties, bucket boundaries,
            expiry, and revocation. The agent can operate, but it cannot rewrite the rules.
          </p>
          <a href="#security">Follow the control path <span aria-hidden="true">→</span></a>
        </div>
        <div className={styles.mandateVisual}>
          <Image
            alt="Three policy-defined treasury buckets: operating, reserve, and vendor committed"
            fill
            sizes="(max-width: 760px) 100vw, 60vw"
            src="/assets/sections/mandate.webp"
          />
        </div>
      </section>

      <section className={styles.privacy} id="security">
        <div className={styles.privacyVisual}>
          <Image
            alt="Encrypted invoice layers separated from public financial execution"
            fill
            sizes="(max-width: 760px) 100vw, 55vw"
            src="/assets/sections/privacy.webp"
          />
        </div>
        <div className={styles.copy}>
          <p className={styles.sectionNumber}>02 / COMMERCIAL PRIVACY</p>
          <h2>Private commercial context. Verifiable financial execution.</h2>
          <p>
            Seal encrypts invoice content before Walrus stores the ciphertext. Access is
            policy-controlled; execution remains independently auditable.
          </p>
          <p className={styles.truthNote}>
            Amounts and recipient addresses remain public on Sui.
          </p>
        </div>
      </section>

      <section className={styles.authorization}>
        <div className={styles.copy}>
          <p className={styles.sectionNumber}>03 / HUMAN CONTROL</p>
          <h2>Humans approve exceptions. Not every transaction.</h2>
          <p>
            Routine payments execute inside the mandate. Material exceptions request a
            fresh authorization bound to one action and one expiry window.
          </p>
          <p className={styles.truthNote}>Event authorization uses mocked identities.</p>
        </div>
        <div className={styles.authorizationVisual}>
          <Image
            alt="Human authorization gateway connecting an encrypted invoice to an onchain receipt"
            fill
            sizes="(max-width: 760px) 100vw, 56vw"
            src="/assets/sections/authorization.webp"
          />
        </div>
        <ol className={styles.authorizationRail}>
          {authorizationSteps.map(([number, label]) => (
            <li key={number}>
              <span>{number}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.audit}>
        <Image
          alt="A continuous audit receipt surrounded by policy and transaction records"
          fill
          sizes="100vw"
          src="/assets/sections/audit.webp"
        />
        <div aria-hidden="true" className={styles.auditShade} />
        <div className={styles.copy}>
          <p className={styles.sectionNumber}>04 / EVIDENCE</p>
          <h2>Every decision leaves a receipt.</h2>
          <p>
            Agent evaluation, deterministic policy checks, authorization, and settlement
            produce an inspectable operational history.
          </p>
        </div>
        <ReceiptEvidence />
      </section>

      <section className={styles.protocols} id="docs">
        <div className={styles.protocolHeading}>
          <p className={styles.sectionNumber}>PROTOCOL ROLES</p>
          <h2>Built for a programmable treasury ecosystem.</h2>
        </div>
        <ul>
          {protocols.map(([name, symbol, role]) => (
            <li key={name}>
              <IntegrationMark label={name} symbol={symbol} />
              <p>{role}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.closing}>
        <Image
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          src="/assets/textures/closing-landscape.webp"
        />
        <div className={styles.closingCopy}>
          <p>COFFER</p>
          <h2>Autonomous capital for the agentic era.</h2>
          <Link href="/app/overview">Launch App <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </div>
  );
}
