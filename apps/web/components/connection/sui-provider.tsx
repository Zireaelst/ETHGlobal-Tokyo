"use client";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import type { ReactNode } from "react";
import { dAppKit } from "../../lib/sui/dapp-kit";

export function SuiProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
