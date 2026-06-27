import { isDatabaseConfigured } from "./db/client";
import {
  persistCompleteMonitorRun,
  readLatestDigestFromDb,
  readMonitorConfigFromDb,
  writeMonitorConfigToDb,
} from "./db/monitor-store";
import type { MarketRadarDigestOutput } from "./digest";
import type { MarketRadarRunOutcome } from "./lite-schema";
import type { MarketRadarMonitorConfig } from "./monitor-config";
import type { FetchedObservation } from "./sources/types";
import * as fileStorage from "./storage-file";

function requireProductionPersistence(): void {
  if (process.env.VERCEL && !isDatabaseConfigured()) {
    throw new Error(
      "POSTGRES_URL is required on Vercel for durable monitor persistence.",
    );
  }
}

export async function readMonitorConfig(): Promise<MarketRadarMonitorConfig | null> {
  if (isDatabaseConfigured()) {
    return readMonitorConfigFromDb();
  }
  return fileStorage.readMonitorConfig();
}

export async function writeMonitorConfig(
  config: MarketRadarMonitorConfig,
): Promise<void> {
  requireProductionPersistence();
  if (isDatabaseConfigured()) {
    await writeMonitorConfigToDb(config);
    return;
  }
  await fileStorage.writeMonitorConfig(config);
}

export async function readLatestDigest(): Promise<MarketRadarDigestOutput | null> {
  if (isDatabaseConfigured()) {
    return readLatestDigestFromDb();
  }
  return fileStorage.readLatestDigest();
}

export async function persistRadarRun(input: {
  trigger: "manual" | "cron";
  outcome: MarketRadarRunOutcome;
  digest: MarketRadarDigestOutput;
  rawObservations: FetchedObservation[];
  deliveryTargets?: Array<{ channel: string; target: string }>;
}): Promise<{ runId?: string; digestId?: string }> {
  requireProductionPersistence();
  if (!isDatabaseConfigured()) {
    await fileStorage.saveLatestDigest(input.digest);
    return {};
  }

  return persistCompleteMonitorRun({
    trigger: input.trigger,
    outcome: input.outcome,
    digest: input.digest,
    rawObservations: input.rawObservations.map((observation) => ({
      sourceId: observation.sourceId,
      sourceKind: observation.sourceKind,
      sourceUrl: observation.sourceUrl,
      item: observation,
    })),
    deliveryTargets: input.deliveryTargets,
  });
}
