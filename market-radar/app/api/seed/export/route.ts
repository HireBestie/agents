import { NextResponse } from "next/server";

import { readBestieSeed } from "@/lib/persistence";

export const dynamic = "force-dynamic";

/** Export confirmed seed for managed Bestie import. */
export async function GET() {
  const seed = await readBestieSeed();
  if (!seed) {
    return NextResponse.json(
      { error: "No Bestie seed saved yet. Complete Train Bestie first." },
      { status: 404 },
    );
  }
  return NextResponse.json({ seed });
}
