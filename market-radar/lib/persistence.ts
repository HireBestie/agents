import { isDatabaseConfigured } from "./db/client";
import {
  persistCompleteMonitorRun,
  readMonitorBundleFromDb,
  readLatestDigestFromDb,
  writeBestieSeedToDb,
  writeMonitorConfigToDb,
} from "./db/monitor-store";
import type { MarketRadarDigestOutput } from "./digest";
import type { MarketRadarRunOutcome } from "./lite-schema";
import type { MarketRadarMonitorConfig } from "./monitor-config";
import {
  BestieSeedV1Schema,
  bestieSeedToMonitorConfig,
  monitorConfigToBestieSeed,
  resolveAuthoritativeMonitorBundle,
  type AuthoritativeMonitorBundle,
  type BestieSeedV1,
} from "./ontology-seed";
import type { FetchedObservation } from "./sources/types";
import * as fileStorage from "./storage-file";

function requireProductionPersistence(): void {
  if (process.env.VERCEL && !isDatabaseConfigured()) {
    throw new Error(
      "POSTGRES_URL is required on Vercel for durable monitor persistence.",
    );
  }
}

/** Seed-first bundle read — see ontology-seed.ts seed authority convention. */
export async function readAuthoritativeMonitorBundle(): Promise<AuthoritativeMonitorBundle | null> {
  if (isDatabaseConfigured()) {
    const bundle = await readMonitorBundleFromDb();
    if (!bundle) return null;
    return resolveAuthoritativeMonitorBundle({
      legacyConfig: bundle.bestieSeed ? null : bundle.config,
      bestieSeed: bundle.bestieSeed,
    });
  }

  const [bestieSeed, legacyConfig] = await Promise.all([
    fileStorage.readBestieSeed(),
    fileStorage.readMonitorConfig(),
  ]);

  return resolveAuthoritativeMonitorBundle({ legacyConfig, bestieSeed });
}

export async function readMonitorConfig(): Promise<MarketRadarMonitorConfig | null> {
  const bundle = await readAuthoritativeMonitorBundle();
  return bundle?.config ?? null;
}

export async function readBestieSeed(): Promise<BestieSeedV1 | null> {
  const bundle = await readAuthoritativeMonitorBundle();
  return bundle?.bestieSeed ?? null;
}

export async function writeMonitorConfig(
  config: MarketRadarMonitorConfig,
): Promise<void> {
  requireProductionPersistence();

  const existing = await readBestieSeed();
  if (existing) {
    throw new Error(
      "bestie_seed is authoritative — POST { bestieSeed } instead of legacy config.",
    );
  }

  const seed = monitorConfigToBestieSeed(config);
  if (isDatabaseConfigured()) {
    await writeMonitorConfigToDb(config, seed);
    return;
  }
  await fileStorage.writeBestieSeed(seed, bestieSeedToMonitorConfig(seed));
}

export async function writeBestieSeed(seed: BestieSeedV1): Promise<MarketRadarMonitorConfig> {
  const parsed = BestieSeedV1Schema.parse(seed);
  const config = bestieSeedToMonitorConfig(parsed);
  requireProductionPersistence();
  if (isDatabaseConfigured()) {
    return writeBestieSeedToDb(parsed);
  }
  await fileStorage.writeBestieSeed(parsed, config);
  return config;
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
