import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const envPath = resolve(process.cwd(), ".env");
const rpcUrl = "https://fullnode.testnet.sui.io:443";

function createProjectSigner() {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
  if (process.env.COFFER_TESTNET_PRIVATE_KEY) {
    return Ed25519Keypair.fromSecretKey(
      process.env.COFFER_TESTNET_PRIVATE_KEY,
    );
  }

  const signer = Ed25519Keypair.generate();
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  const additions = [
    "# Project-only Sui testnet deployment signer; never commit this file.",
    `COFFER_TESTNET_PRIVATE_KEY=${signer.getSecretKey()}`,
    "SUI_NETWORK=testnet",
    `SUI_RPC_URL=${rpcUrl}`,
    "",
  ].join("\n");
  writeFileSync(envPath, `${existing}${separator}${additions}`, {
    mode: 0o600,
  });
  return signer;
}

async function main() {
  const signer = createProjectSigner();
  const address = signer.toSuiAddress();
  const client = new SuiGrpcClient({ network: "testnet", baseUrl: rpcUrl });
  let balance = (await client.getBalance({ owner: address })).balance.balance;
  if (BigInt(balance) === 0n) {
    await requestSuiFromFaucetV2({
      host: getFaucetHost("testnet"),
      recipient: address,
    });
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const response = await client.getBalance({ owner: address });
      balance = response.balance.balance;
      if (BigInt(balance) > 0n) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  if (BigInt(balance) === 0n) {
    throw new Error("Faucet request succeeded but testnet balance was not indexed");
  }

  console.log(JSON.stringify({ address, balanceMIST: balance }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
