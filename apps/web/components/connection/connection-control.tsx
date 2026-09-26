"use client";

import { useDAppKit, useWalletConnection, useWallets } from "@mysten/dapp-kit-react";
import { isEnokiWallet, isGoogleWallet } from "@mysten/enoki";
import { useEffect, useRef, useState } from "react";
import { getPublicConfig } from "../../lib/env";
import { dAppKit } from "../../lib/sui/dapp-kit";
import styles from "./connection.module.css";

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
  const standardWallets = wallets.filter((wallet) => !isEnokiWallet(wallet));
  const [connectionError, setConnectionError] = useState<string | null>(null);

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

  async function connect(wallet: (typeof wallets)[number]) {
    setConnectionError(null);
    try {
      await kit.connectWallet({ wallet });
      onClose();
    } catch {
      setConnectionError("Connection could not be completed. Try again or choose another wallet.");
    }
  }

  return (
    <div className={styles.backdrop}>
      <button aria-label="Close account connection" className={styles.backdropButton} onClick={onClose} type="button" />
      <section aria-label={`Connect to ${actionLabel.toLowerCase()}`} aria-modal="true" className={styles.dialog} role="dialog">
        <header><div><span>ACCOUNT ACCESS</span><h2>Choose how to continue</h2></div><button aria-label="Close account connection" onClick={onClose} ref={closeButton} type="button">×</button></header>
        <p>Coffer remains browsable without an account. Connect only when an action needs a signer.</p>
        <div className={styles.connectionChoices}>
          {config.enoki && googleWallet ? (
            <button aria-label="Continue with Google" className={styles.googleAction} onClick={() => void connect(googleWallet)} type="button">
              <span>Continue with Google</span><small>Enoki zkLogin · no seed phrase</small>
            </button>
          ) : null}
          {config.enoki && !googleWallet ? <small className={styles.configurationNote}>Preparing Google sign-in…</small> : null}
          {standardWallets.length ? (
            <div className={styles.walletList}>
              {standardWallets.map((wallet) => (
                <button aria-label={`Continue with ${wallet.name}`} className={styles.walletAction} key={wallet.name} onClick={() => void connect(wallet)} type="button">
                  <span>Continue with {wallet.name}</span><small>Sui wallet extension</small>
                </button>
              ))}
            </div>
          ) : <small className={styles.configurationNote}>No Sui wallet detected. Install a wallet extension or use Google.</small>}
        </div>
        {!config.enoki ? <small className={styles.configurationNote}>Google sign-in needs public Enoki configuration.</small> : null}
        {connectionError ? <small className={styles.connectionError} role="alert">{connectionError}</small> : null}
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
