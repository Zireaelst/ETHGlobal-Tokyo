"use client";

import dynamic from "next/dynamic";
import styles from "./app-shell.module.css";

const ConnectionControl = dynamic(
  () => import("../connection/connection-control").then((module) => module.ConnectionControl),
  {
    ssr: false,
    loading: () => <span>Account access loading</span>,
  },
);

type TopBarProps = {
  menuOpen: boolean;
  onMenuToggle: () => void;
};

export function TopBar({ menuOpen, onMenuToggle }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <button
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close workspace navigation" : "Open workspace navigation"}
        className={styles.mobileMenuButton}
        onClick={onMenuToggle}
        type="button"
      >
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
      </button>
      <div className={styles.treasurySelector}>
        <span>TREASURY</span>
        <strong>Tokyo Operations Treasury</strong>
      </div>
      <div className={styles.environmentStatus}>
        <span><i /> Sui Testnet</span>
        <span>Demo workspace</span>
      </div>
      <div aria-label="Account status" className={styles.accountStatus}><ConnectionControl /></div>
    </header>
  );
}
