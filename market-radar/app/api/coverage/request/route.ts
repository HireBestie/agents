import { NextResponse } from "next/server";
import { z } from "zod";

import { createCoverageRequest } from "@/lib/db/coverage-store";
import { isDatabaseConfigured } from "@/lib/db/client";
import { AudiencePainIdSchema } from "@/lib/ontology-seed";

export const dynamic = "force-dynamic";

const CoverageRequestSchema = z.object({
  painId: AudiencePainIdSchema,
  requestedCapability: z.string().min(1).max(200),
  context: z.record(z.string(), z.unknown()).optional(),
  contactEmail: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const body = CoverageRequestSchema.parse(await request.json());

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "Memory is required to persist coverage requests. Connect Postgres on Vercel.",
        },
        { status: 503 },
      );
    }

    const coverageRequest = await createCoverageRequest(body);
    return NextResponse.json({
      id: coverageRequest.id,
      status: coverageRequest.created ? "recorded" : "upvoted",
      requestCount: coverageRequest.requestCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record coverage request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
