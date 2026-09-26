import { NextResponse } from "next/server";
import { runLiveAgentDemo } from "../../../../lib/demo/live-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin live runs are not allowed." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { scenario?: string } | null;
  if (body?.scenario !== "auto_execute") {
    return NextResponse.json({ error: "Live mode currently supports only auto_execute." }, { status: 400 });
  }

  try {
    return NextResponse.json(await runLiveAgentDemo(), {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Live agent run failed." },
      { status: 503 },
    );
  }
}
