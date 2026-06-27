import { NextResponse } from "next/server";
import { z } from "zod";

import { createSourceRequest } from "@/lib/db/monitor-store";
import { isDatabaseConfigured } from "@/lib/db/client";
import { verifyRunToken } from "@/lib/run-auth";

export const dynamic = "force-dynamic";

const SourceRequestSchema = z.object({
  requestedKind: z.string().min(1).max(100),
  requestedDetail: z.string().min(1).max(2_000),
  context: z.record(z.string(), z.unknown()).optional(),
  runToken: z.string().min(1).max(256).optional(),
});

export async function POST(request: Request) {
  try {
    const body = SourceRequestSchema.parse(await request.json());
    verifyRunToken(body.runToken);

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "POSTGRES_URL is required to persist source requests. Add Neon Postgres for durable backlog tracking.",
        },
        { status: 503 },
      );
    }

    const id = await createSourceRequest(body);
    return NextResponse.json({ id, status: "pending" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record source request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
