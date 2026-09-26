import { normalizeSuiAddress } from "@mysten/sui/utils";
import { z } from "zod";

const configSchema = z.object({
  network: z.enum(["devnet", "testnet", "mainnet", "localnet"]),
  rpcUrl: z.url(),
  packageId: z.string().min(1),
  coinType: z.string().regex(/^0x[0-9a-fA-F]+::[A-Za-z_][\w]*::[A-Za-z_][\w]*$/),
});

export type CofferSuiConfig = z.infer<typeof configSchema>;

export function parseCofferSuiConfig(input: unknown): CofferSuiConfig {
  const parsed = configSchema.parse(input);
  return {
    ...parsed,
    packageId: normalizeSuiAddress(parsed.packageId),
  };
}
