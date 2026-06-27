import { NextResponse } from "next/server";

import { MarketRadarRunRequestSchema } from "@/lib/lite-schema";
import { verifyRunToken } from "@/lib/run-auth";
import { executeMonitorRun } from "@/lib/run-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BODY_BYTES = 65_536;

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large." },
        { status: 413 },
      );
    }

    const body = JSON.parse(rawBody) as unknown;
    verifyRunToken(
      body && typeof body === "object" && "runToken" in body
        ? (body as { runToken?: unknown }).runToken
        : undefined,
    );

    const input = MarketRadarRunRequestSchema.parse(body);
    const result = await executeMonitorRun({
      request: input,
      trigger: "manual",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Market Radar run failed.";
    const status =
      message.includes("run token") || message.includes("Blocked")
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
