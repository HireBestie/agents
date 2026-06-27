import { NextResponse } from "next/server";

import { MarketRadarMonitorConfigSchema, assertActiveSourcesAreExecutable } from "@/lib/monitor-config";
import { readMonitorConfig, writeMonitorConfig } from "@/lib/persistence";
import { verifyRunToken } from "@/lib/run-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readMonitorConfig();
  return NextResponse.json({ config });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    verifyRunToken(
      body && typeof body === "object" && "runToken" in body
        ? (body as { runToken?: unknown }).runToken
        : undefined,
    );
    const config = MarketRadarMonitorConfigSchema.parse(
      (body as { config?: unknown }).config ?? body,
    );
    assertActiveSourcesAreExecutable(config.sources);
    await writeMonitorConfig(config);
    return NextResponse.json({ config });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save monitor config.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
