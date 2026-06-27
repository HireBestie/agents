import { NextResponse } from "next/server";

import { readLatestDigest } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export async function GET() {
  const digest = await readLatestDigest();
  return NextResponse.json({
    digest,
    digestMarkdown: digest?.digestMarkdown ?? null,
  });
}
