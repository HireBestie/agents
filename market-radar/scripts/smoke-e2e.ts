#!/usr/bin/env bun
/**
 * Live smoke: seed → manual run → cron → DB verification.
 *
 * Required env:
 *   POSTGRES_URL, AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN)
 *   RESEND_API_KEY, MARKET_RADAR_FROM_EMAIL
 *   SMOKE_BASE_URL (default http://127.0.0.1:3847)
 *   SMOKE_DELIVERY_EMAIL
 *   CRON_SECRET, MARKET_RADAR_RUN_TOKEN (optional; generated if missing)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getPool } from "../lib/db/client";
import { ensureSchema } from "../lib/db/migrate";
import { writeMonitorConfigToDb } from "../lib/db/monitor-store";
import {
  MarketRadarMonitorConfigSchema,
  assertActiveSourcesAreExecutable,
  monitorConfigToRunRequest,
} from "../lib/monitor-config";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(scriptDir, "../fixtures/pme-hvac-monitor.json");

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function runBodyWithToken<T extends Record<string, unknown>>(body: T): T {
  const token = process.env.MARKET_RADAR_RUN_TOKEN?.trim();
  return token ? { ...body, runToken: token } : body;
}

async function queryCounts() {
  await ensureSchema();
  const pool = getPool();
  const tables = [
    "monitor_configs",
    "monitor_sources",
    "monitor_runs",
    "monitor_observations",
    "monitor_digests",
    "notification_deliveries",
    "source_requests",
  ] as const;

  const counts: Record<string, number> = {};
  for (const table of tables) {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = result.rows[0]?.count ?? 0;
  }

  const latestDelivery = await pool.query(
    `SELECT channel, target, status, error, provider_message_id, created_at
     FROM notification_deliveries
     ORDER BY created_at DESC
     LIMIT 1`,
  );

  return { counts, latestDelivery: latestDelivery.rows[0] ?? null };
}

async function main() {
  const baseUrl = process.env.SMOKE_BASE_URL?.trim() ?? "http://127.0.0.1:3847";
  const deliveryEmail = requireEnv("SMOKE_DELIVERY_EMAIL");

  if (!process.env.CRON_SECRET?.trim()) {
    process.env.CRON_SECRET = `smoke-${crypto.randomUUID()}`;
  }
  if (!process.env.MARKET_RADAR_RUN_TOKEN?.trim()) {
    process.env.MARKET_RADAR_RUN_TOKEN = `smoke-${crypto.randomUUID()}`;
  }

  requireEnv("POSTGRES_URL");
  if (
    !process.env.AI_GATEWAY_API_KEY?.trim() &&
    !process.env.VERCEL_OIDC_TOKEN?.trim()
  ) {
    throw new Error("AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN required");
  }
  requireEnv("RESEND_API_KEY");
  requireEnv("MARKET_RADAR_FROM_EMAIL");

  const raw = readFileSync(fixturePath, "utf8");
  const config = MarketRadarMonitorConfigSchema.parse({
    ...JSON.parse(raw),
    delivery: { email: deliveryEmail },
  });
  assertActiveSourcesAreExecutable(config.sources);
  await writeMonitorConfigToDb(config);
  console.log("[smoke] seeded monitor config");

  const runBody = runBodyWithToken(monitorConfigToRunRequest(config));
  const manualResponse = await fetch(`${baseUrl}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(runBody),
  });
  const manualJson = await manualResponse.json();
  if (!manualResponse.ok) {
    throw new Error(`Manual run failed (${manualResponse.status}): ${JSON.stringify(manualJson)}`);
  }
  console.log("[smoke] manual run ok", {
    runId: manualJson.runId,
    digestId: manualJson.digestId,
    escalations: manualJson.digest?.escalations?.length ?? 0,
    deliveries: manualJson.deliveries,
  });

  const cronResponse = await fetch(`${baseUrl}/api/cron/daily-radar`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const cronJson = await cronResponse.json();
  if (!cronResponse.ok) {
    throw new Error(`Cron run failed (${cronResponse.status}): ${JSON.stringify(cronJson)}`);
  }
  if (cronJson.skipped) {
    console.log("[smoke] cron skipped (cadence not due) — auth ok");
  } else {
    console.log("[smoke] cron executed", {
      runId: cronJson.runId,
      deliveries: cronJson.deliveries,
    });
  }

  const { counts, latestDelivery } = await queryCounts();
  console.log("[smoke] db counts", counts);
  console.log("[smoke] latest delivery", latestDelivery);

  const failures: string[] = [];
  if (counts.monitor_configs < 1) failures.push("monitor_configs empty");
  if (counts.monitor_sources < 1) failures.push("monitor_sources empty");
  if (counts.monitor_runs < 1) failures.push("monitor_runs empty");
  if (counts.monitor_digests < 1) failures.push("monitor_digests empty");
  if (counts.notification_deliveries < 1) {
    failures.push("notification_deliveries empty");
  } else if (latestDelivery?.status !== "sent") {
    failures.push(`latest delivery status=${latestDelivery?.status}`);
  }

  if (failures.length > 0) {
    console.error("[smoke] FAILED", failures);
    process.exit(1);
  }

  console.log("[smoke] PASSED");
}

main().catch((error) => {
  console.error("[smoke] error", error instanceof Error ? error.message : error);
  process.exit(1);
});
