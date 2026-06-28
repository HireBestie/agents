import { NextResponse } from "next/server";
import { z } from "zod";

import { MarketRadarMonitorConfigSchema, assertActiveSourcesAreExecutable } from "@/lib/monitor-config";
import {
  readAuthoritativeMonitorBundle,
  readBestieSeed,
  writeBestieSeed,
  writeMonitorConfig,
} from "@/lib/persistence";
import {
  BestieSeedV1Schema,
  bestieSeedToMonitorConfig,
  confirmBestieSeed,
  validateSeedForRun,
} from "@/lib/ontology-seed";
import { verifyRunToken } from "@/lib/run-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const bundle = await readAuthoritativeMonitorBundle();
  return NextResponse.json({
    config: bundle?.config ?? null,
    bestieSeed: bundle?.bestieSeed ?? null,
    seedAuthoritative: bundle?.seedAuthoritative ?? false,
  });
}

const BestieSeedPostSchema = z.object({
  bestieSeed: BestieSeedV1Schema,
  confirm: z.boolean().optional(),
  runToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    verifyRunToken(
      body && typeof body === "object" && "runToken" in body
        ? (body as { runToken?: unknown }).runToken
        : undefined,
    );

    if (body && typeof body === "object" && "bestieSeed" in body) {
      const parsed = BestieSeedPostSchema.parse(body);
      let seed = parsed.bestieSeed;

      if (parsed.confirm) {
        seed = confirmBestieSeed(seed);
        validateSeedForRun(seed);
      }

      const config = bestieSeedToMonitorConfig(seed);
      if (seed.sourceSeed.sources.some((s) => s.status === "active")) {
        assertActiveSourcesAreExecutable(config.sources);
      }

      await writeBestieSeed(seed);
      return NextResponse.json({
        config,
        bestieSeed: seed,
        seedAuthoritative: true,
      });
    }

    const existingSeed = await readBestieSeed();
    if (existingSeed) {
      return NextResponse.json(
        {
          error:
            "bestie_seed is authoritative — POST { bestieSeed } instead of legacy config.",
        },
        { status: 409 },
      );
    }

    const config = MarketRadarMonitorConfigSchema.parse(
      (body as { config?: unknown }).config ?? body,
    );
    assertActiveSourcesAreExecutable(config.sources);
    await writeMonitorConfig(config);
    const bundle = await readAuthoritativeMonitorBundle();
    return NextResponse.json({
      config: bundle?.config ?? config,
      bestieSeed: bundle?.bestieSeed ?? null,
      seedAuthoritative: bundle?.seedAuthoritative ?? false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save monitor config.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
