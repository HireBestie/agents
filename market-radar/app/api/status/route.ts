import { NextResponse } from "next/server";

import { getDeployStatus } from "@/lib/deploy-status";
import { readLatestDigest } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getDeployStatus();
  const digest = await readLatestDigest().catch(() => null);

  return NextResponse.json({
    ...status,
    hasDigest: Boolean(digest),
  });
}
