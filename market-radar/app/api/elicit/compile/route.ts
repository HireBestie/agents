import { NextResponse } from "next/server";
import { z } from "zod";

import { compileElicitationToSeed } from "@/lib/elicit-compile";

export const dynamic = "force-dynamic";

const ElicitCompileRequestSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.string().min(1).max(2_000),
      }),
    )
    .min(1)
    .max(12),
});

export async function POST(request: Request) {
  try {
    const body = ElicitCompileRequestSchema.parse(await request.json());
    const result = await compileElicitationToSeed(body);
    return NextResponse.json({
      seed: result.seed,
      coverage: result.coverage,
      sourceBacklog: result.sourceBacklog,
      needsSourceApproval: result.needsSourceApproval,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compile elicitation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
