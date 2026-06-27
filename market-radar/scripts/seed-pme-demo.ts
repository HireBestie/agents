#!/usr/bin/env bun
/**
 * Seed the PME HVAC demo monitor into Neon when POSTGRES_URL is set.
 *
 * Usage:
 *   POSTGRES_URL=... bun run scripts/seed-pme-demo.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MarketRadarMonitorConfigSchema,
  assertActiveSourcesAreExecutable,
} from "../lib/monitor-config";
import { writeMonitorConfigToDb } from "../lib/db/monitor-store";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(scriptDir, "../fixtures/pme-hvac-monitor.json");
const raw = readFileSync(fixturePath, "utf8");
const config = MarketRadarMonitorConfigSchema.parse(JSON.parse(raw));

assertActiveSourcesAreExecutable(config.sources);
await writeMonitorConfigToDb(config);

console.log("Seeded PME HVAC monitor config:", {
  sources: config.sources.length,
  cadence: config.cadence.frequency,
  deliveryEmail: config.delivery?.email ?? null,
});
