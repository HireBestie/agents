import { NextResponse } from "next/server";

import { SOURCE_CATALOG } from "@/lib/sources/types";
import { listAvailableSourceAdapters } from "@/lib/sources/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const availableNow = listAvailableSourceAdapters();
  const catalog = Object.entries(SOURCE_CATALOG).map(([kind, meta]) => ({
    kind,
    ...meta,
    adapterReady: availableNow.includes(kind as (typeof availableNow)[number]),
  }));

  return NextResponse.json({ catalog });
}
