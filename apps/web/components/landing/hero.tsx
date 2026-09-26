import Image from "next/image";
import Link from "next/link";
import { IntegrationMark } from "./integration-mark";
import styles from "./hero.module.css";

const integrations = [
  { label: "Sui", symbol: "S" },
  { label: "World", symbol: "W" },
  { label: "Seal", symbol: "◇" },
  { label: "Walrus", symbol: "≋" },
] as const;

const facts = [
  { symbol: "#", text: "3 Treasury Buckets" },
  { symbol: "✳", text: "4 Agent Outcomes" },
  { symbol: "◌", text: "1× Action-bound Authorization" },
  { symbol: "↗", text: "2 Access Paths" },
] as const;

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className={styles.hero} id="product">
      <Image
        alt="Halftone landscape of Mount Fuji, a rising sun, forest, and water"
        className={styles.background}
        fill
        priority
        sizes="100vw"
        src="/assets/hero/hero-fuji.webp"
      />
      <div aria-hidden="true" className={styles.overlay} />

      <div className={styles.content}>
        <p className={styles.eyebrow}>COFFER</p>
        <h1 aria-label="Autonomous Treasury. Within Your Rules." id="hero-title">
          <span>Autonomous Treasury.</span>
          <span>Within Your Rules.</span>
        </h1>
        <p className={styles.description}>
          AI operates within enforceable spending mandates. Humans control the exceptions.
        </p>

        <ul aria-label="Technology stack" className={styles.integrations}>
          {integrations.map((integration) => (
            <li key={integration.label}>
              <IntegrationMark {...integration} />
            </li>
          ))}
          <li className={styles.policyLabel}>Policy-enforced on Sui</li>
        </ul>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/app/overview">
            Launch Demo <span aria-hidden="true">→</span>
          </Link>
          <a className={styles.secondaryAction} href="#how-it-works">
            See how it works <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>

      <ul aria-label="Product facts" className={styles.facts}>
        {facts.map((fact) => (
          <li key={fact.text}>
            <span aria-hidden="true" className={styles.factSymbol}>
              {fact.symbol}
            </span>
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
