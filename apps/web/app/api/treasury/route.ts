import { SuiGrpcClient } from "@mysten/sui/grpc";
import { NextResponse } from "next/server";
import { TESTNET_DEPLOYMENT } from "../../../lib/deployment";
import { getPublicConfig } from "../../../lib/env";
import { readTreasurySnapshot } from "../../../lib/sui/live-treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPublicConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const client = new SuiGrpcClient({ network: config.network, baseUrl: config.grpcUrl });
    const snapshot = await readTreasurySnapshot(client, TESTNET_DEPLOYMENT, controller.signal);
    return NextResponse.json(snapshot, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } finally {
    clearTimeout(timeout);
  }
}
