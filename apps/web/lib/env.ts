export type PublicConfig = {
  network: "testnet";
  grpcUrl: string;
  enoki?: {
    apiKey: string;
    googleClientId: string;
  };
};

type PublicEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SUI_NETWORK?: string;
  NEXT_PUBLIC_SUI_GRPC_URL?: string;
  NEXT_PUBLIC_ENOKI_API_KEY?: string;
  NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string;
};

export function getPublicConfig(environment: PublicEnvironment = process.env): PublicConfig {
  const requestedNetwork = environment.NEXT_PUBLIC_SUI_NETWORK?.trim();
  if (requestedNetwork && requestedNetwork !== "testnet") {
    throw new Error(`Coffer only supports Sui testnet; received ${requestedNetwork}.`);
  }

  const base = {
    network: "testnet" as const,
    grpcUrl:
      environment.NEXT_PUBLIC_SUI_GRPC_URL?.trim() ||
      "https://fullnode.testnet.sui.io:443",
  };
  const apiKey = environment.NEXT_PUBLIC_ENOKI_API_KEY?.trim();
  const googleClientId = environment.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  return apiKey && googleClientId
    ? { ...base, enoki: { apiKey, googleClientId } }
    : base;
}
