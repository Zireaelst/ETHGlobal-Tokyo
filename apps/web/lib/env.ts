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
  NEXT_PUBLIC_SUI_NETWORK?: string | undefined;
  NEXT_PUBLIC_SUI_GRPC_URL?: string | undefined;
  NEXT_PUBLIC_ENOKI_API_KEY?: string | undefined;
  NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string | undefined;
};

const browserPublicEnvironment: PublicEnvironment = {
  NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
  NEXT_PUBLIC_SUI_GRPC_URL: process.env.NEXT_PUBLIC_SUI_GRPC_URL,
  NEXT_PUBLIC_ENOKI_API_KEY: process.env.NEXT_PUBLIC_ENOKI_API_KEY,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
};

export function getPublicConfig(
  environment: PublicEnvironment = browserPublicEnvironment,
): PublicConfig {
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
