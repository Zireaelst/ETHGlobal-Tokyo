"use client";

import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { isEnokiWallet } from "@mysten/enoki";
import { dAppKit } from "../../lib/sui/dapp-kit";

export function WalletConnectButton() {
  return (
    <ConnectButton instance={dAppKit} modalOptions={{ filterFn: (wallet) => !isEnokiWallet(wallet) }}>
      <span>Connect Sui Wallet</span>
    </ConnectButton>
  );
}
