import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  MarketRadarMonitorConfigSchema,
  type MarketRadarMonitorConfig,
} from "./monitor-config";
import type { MarketRadarDigestOutput } from "./digest";
import {
  BestieSeedV1Schema,
  type BestieSeedV1,
} from "./ontology-seed";

const CONFIG_FILE = "config.json";
const SEED_FILE = "bestie-seed.json";
const LATEST_DIGEST_FILE = "latest-digest.json";
const HISTORY_DIR = "runs";

function resolveDataDir(): string {
  if (process.env.MARKET_RADAR_DATA_DIR?.trim()) {
    return process.env.MARKET_RADAR_DATA_DIR.trim();
  }
  return join(process.cwd(), ".data");
}

async function ensureDataDir() {
  const dir = resolveDataDir();
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, HISTORY_DIR), { recursive: true });
  return dir;
}

export async function readMonitorConfig(): Promise<MarketRadarMonitorConfig | null> {
  const envJson = process.env.MARKET_RADAR_MONITOR_CONFIG?.trim();
  if (envJson) {
    return MarketRadarMonitorConfigSchema.parse(JSON.parse(envJson));
  }

  try {
    const dir = resolveDataDir();
    const raw = await readFile(join(dir, CONFIG_FILE), "utf8");
    return MarketRadarMonitorConfigSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeMonitorConfig(
  config: MarketRadarMonitorConfig,
): Promise<void> {
  const dir = await ensureDataDir();
  await writeFile(join(dir, CONFIG_FILE), JSON.stringify(config, null, 2), "utf8");
}

export async function readBestieSeed(): Promise<BestieSeedV1 | null> {
  try {
    const dir = resolveDataDir();
    const raw = await readFile(join(dir, SEED_FILE), "utf8");
    return BestieSeedV1Schema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeBestieSeed(
  seed: BestieSeedV1,
  config: MarketRadarMonitorConfig,
): Promise<void> {
  const dir = await ensureDataDir();
  await writeFile(join(dir, SEED_FILE), JSON.stringify(seed, null, 2), "utf8");
  await writeFile(join(dir, CONFIG_FILE), JSON.stringify(config, null, 2), "utf8");
}

export async function saveLatestDigest(
  digest: MarketRadarDigestOutput,
): Promise<void> {
  const dir = await ensureDataDir();
  await writeFile(
    join(dir, LATEST_DIGEST_FILE),
    JSON.stringify(digest, null, 2),
    "utf8",
  );
  const stamp = digest.generatedAt.replace(/[:.]/g, "-");
  await writeFile(
    join(dir, HISTORY_DIR, `${stamp}.json`),
    JSON.stringify(digest, null, 2),
    "utf8",
  );
}

export async function readLatestDigest(): Promise<MarketRadarDigestOutput | null> {
  try {
    const dir = resolveDataDir();
    const raw = await readFile(join(dir, LATEST_DIGEST_FILE), "utf8");
    return JSON.parse(raw) as MarketRadarDigestOutput;
  } catch {
    return null;
  }
}
