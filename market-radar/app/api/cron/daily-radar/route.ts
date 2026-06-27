import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import {
  monitorConfigToRunRequest,
  shouldRunScheduledMonitor,
} from "@/lib/monitor-config";
import { readMonitorConfig } from "@/lib/persistence";
import { executeMonitorRun } from "@/lib/run-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    verifyCronSecret(request);
    const config = await readMonitorConfig();
    if (!config) {
      return NextResponse.json(
        {
          error:
            "No monitor config found. Save config via POST /api/config first.",
        },
        { status: 400 },
      );
    }

    if (!shouldRunScheduledMonitor(config.cadence)) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Cadence ${config.cadence.frequency} not due at ${new Date().toISOString()}`,
      });
    }

    const result = await executeMonitorRun({
      request: monitorConfigToRunRequest(config),
      trigger: "cron",
      config,
    });

    return NextResponse.json({
      ok: true,
      skipped: false,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily radar cron failed.";
    const status = message.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
