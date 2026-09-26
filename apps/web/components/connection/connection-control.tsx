"use client";

import { useDAppKit, useWalletConnection, useWallets } from "@mysten/dapp-kit-react";
import { isGoogleWallet } from "@mysten/enoki";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { getPublicConfig } from "../../lib/env";
import { dAppKit } from "../../lib/sui/dapp-kit";
import styles from "./connection.module.css";

const WalletConnectButton = dynamic(
  () => import("./wallet-connect-button").then((module) => module.WalletConnectButton),
  { ssr: false },
);

type ConnectionDialogProps = {
  actionLabel: string;
  open: boolean;
  onClose: () => void;
};

export function ConnectionDialog({ actionLabel, open, onClose }: ConnectionDialogProps) {
  const kit = useDAppKit(dAppKit);
  const wallets = useWallets({ dAppKit });
  const config = getPublicConfig();
  const closeButton = useRef<HTMLButtonElement>(null);
  const googleWallet = wallets.find((wallet) => isGoogleWallet(wallet));

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  async function connectGoogle() {
    if (!googleWallet) return;
    await kit.connectWallet({ wallet: googleWallet });
    onClose();
  }

  return (
    <div className={styles.backdrop}>
      <button aria-label="Close account connection" className={styles.backdropButton} onClick={onClose} type="button" />
      <section aria-label={`Connect to ${actionLabel.toLowerCase()}`} aria-modal="true" className={styles.dialog} role="dialog">
        <header><div><span>ACCOUNT ACCESS</span><h2>Choose how to continue</h2></div><button aria-label="Close account connection" onClick={onClose} ref={closeButton} type="button">×</button></header>
        <p>Coffer remains browsable without an account. Connect only when an action needs a signer.</p>
        <div className={styles.connectionChoices}>
          <button aria-label="Continue with Google" disabled={!config.enoki || !googleWallet} onClick={connectGoogle} type="button">
            <span>Continue with Google</span><small>Enoki zkLogin · no seed phrase</small>
          </button>
          <WalletConnectButton />
        </div>
        {!config.enoki ? <small className={styles.configurationNote}>Google sign-in is unavailable until Enoki public configuration is added.</small> : null}
      </section>
    </div>
  );
}

export function ConnectionControl() {
  const kit = useDAppKit(dAppKit);
  const connection = useWalletConnection({ dAppKit });
  const [open, setOpen] = useState(false);

  if (connection.isConnected) {
    const address = connection.account.address;
    return (
      <div className={styles.connectedControl}>
        <span>ACCOUNT ACCESS</span>
        <button onClick={() => void kit.disconnectWallet()} title="Disconnect account" type="button">
          {address.slice(0, 6)}…{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.disconnectedControl}>
      <span>ACCOUNT ACCESS</span>
      <button onClick={() => setOpen(true)} type="button">Connect account</button>
      <ConnectionDialog actionLabel="access Coffer" onClose={() => setOpen(false)} open={open} />
    </div>
  );
}
