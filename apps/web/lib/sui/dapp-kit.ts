import { createDAppKit } from "@mysten/dapp-kit-react";
import { registerEnokiWallets } from "@mysten/enoki";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { getEnokiRedirectUrl, getPublicConfig } from "../env";

const config = getPublicConfig();
const testnetClient = new SuiGrpcClient({
  network: config.network,
  baseUrl: config.grpcUrl,
});

export const dAppKit = createDAppKit({
  networks: [config.network],
  defaultNetwork: config.network,
  createClient: () => testnetClient,
  autoConnect: true,
  storage: null,
  storageKey: "coffer:selected-wallet-and-address",
  slushWalletConfig: null,
});

declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}

type CofferBrowserGlobal = typeof globalThis & {
  __cofferEnokiRegistered?: boolean;
};

const browserGlobal = globalThis as CofferBrowserGlobal;

if (typeof window !== "undefined" && config.enoki && !browserGlobal.__cofferEnokiRegistered) {
  registerEnokiWallets({
    apiKey: config.enoki.apiKey,
    clients: [testnetClient],
    getCurrentNetwork: () => dAppKit.stores.$currentNetwork.get(),
    providers: {
      google: {
        clientId: config.enoki.googleClientId,
        redirectUrl: getEnokiRedirectUrl(window.location.origin),
      },
    },
  });
  browserGlobal.__cofferEnokiRegistered = true;
}
