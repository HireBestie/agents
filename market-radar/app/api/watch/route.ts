import { NextResponse } from "next/server";

import { readWatchRoomSnapshot } from "@/lib/db/watch-store";
import { isDatabaseConfigured } from "@/lib/db/client";
import { readMonitorConfig } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readMonitorConfig().catch(() => null);
  const watch =
    isDatabaseConfigured() ?
      await readWatchRoomSnapshot().catch(() => null)
    : null;

  return NextResponse.json({
    configured: Boolean(config),
    cadence: config?.cadence ?? null,
    deliveryEmail: config?.delivery?.email ?? null,
    watch,
  });
}
