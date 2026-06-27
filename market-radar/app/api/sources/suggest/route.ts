import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyRunToken } from "@/lib/run-auth";
import { suggestSources } from "@/lib/suggest-sources";

export const dynamic = "force-dynamic";

const SuggestRequestSchema = z.object({
  operatorSummary: z.string().min(1).max(4_000),
  assumptions: z.array(z.string().min(1)).min(1).max(20),
  principles: z.array(z.string().min(1)).min(1).max(20),
  geography: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  runToken: z.string().min(1).max(256).optional(),
});

export async function POST(request: Request) {
  try {
    const body = SuggestRequestSchema.parse(await request.json());
    verifyRunToken(body.runToken);
    const result = await suggestSources(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Source suggestion failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
