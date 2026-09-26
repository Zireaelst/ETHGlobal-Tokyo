"use client";

import { useWalletConnection } from "@mysten/dapp-kit-react";
import { useState } from "react";
import { dAppKit } from "../../lib/sui/dapp-kit";
import { ConnectionDialog } from "./connection-control";
import styles from "./connection.module.css";

type ActionGateProps = {
  actionLabel: string;
  onConnectedAction: () => void | Promise<void>;
};

export function ActionGate({ actionLabel, onConnectedAction }: ActionGateProps) {
  const connection = useWalletConnection({ dAppKit });
  const [open, setOpen] = useState(false);

  async function handleAction() {
    if (!connection.isConnected) {
      setOpen(true);
      return;
    }
    await onConnectedAction();
  }

  return (
    <>
      <button className={styles.actionButton} onClick={() => void handleAction()} type="button">{actionLabel}</button>
      <ConnectionDialog actionLabel={actionLabel} onClose={() => setOpen(false)} open={open} />
    </>
  );
}
