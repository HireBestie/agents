import { randomUUID } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";

import type { MarketRadarDigestOutput } from "../digest";
import type { MarketRadarLiteItem, MarketRadarRunOutcome } from "../lite-schema";
import type { MarketRadarMonitorConfig, SourceRegistryEntry } from "../monitor-config";
import {
  BestieSeedV1Schema,
  bestieSeedToMonitorConfig,
  monitorConfigToBestieSeed,
  resolveAuthoritativeMonitorBundle,
  type BestieSeedV1,
} from "../ontology-seed";
import { getPool } from "./client";
import { ensureSchema } from "./migrate";
import { withTransaction } from "./transaction";

const DEFAULT_CONFIG_ID = "default";

type RunTrigger = "manual" | "cron";

export type PersistedRunRecord = {
  runId: string;
  digestId: string;
};

function rowToConfig(row: {
  operator_summary: string;
  assumptions: unknown;
  principles: unknown;
  cadence: unknown;
  escalation_policy: string;
  since_hours: number;
  delivery: unknown;
}): Omit<MarketRadarMonitorConfig, "sources"> {
  return {
    schemaVersion: 1,
    operatorSummary: row.operator_summary,
    assumptions: row.assumptions as string[],
    principles: row.principles as string[],
    cadence: row.cadence as MarketRadarMonitorConfig["cadence"],
    escalationPolicy:
      row.escalation_policy as MarketRadarMonitorConfig["escalationPolicy"],
    sinceHours: row.since_hours,
    delivery: (row.delivery ?? {}) as MarketRadarMonitorConfig["delivery"],
  };
}

export async function readMonitorConfigFromDb(): Promise<MarketRadarMonitorConfig | null> {
  const bundle = await readMonitorBundleFromDb();
  return bundle?.config ?? null;
}

export async function readBestieSeedFromDb(): Promise<BestieSeedV1 | null> {
  const bundle = await readMonitorBundleFromDb();
  return bundle?.bestieSeed ?? null;
}

export async function readMonitorBundleFromDb(): Promise<{
  config: MarketRadarMonitorConfig;
  bestieSeed: BestieSeedV1 | null;
} | null> {
  await ensureSchema();
  const pool = getPool();
  const configResult = await pool.query(
    `SELECT operator_summary, assumptions, principles, cadence, escalation_policy, since_hours, delivery, bestie_seed
     FROM monitor_configs WHERE id = $1`,
    [DEFAULT_CONFIG_ID],
  );
  if (configResult.rowCount === 0) return null;

  const row = configResult.rows[0];
  const rawSeed = row.bestie_seed;
  const parsedSeed =
    rawSeed ? BestieSeedV1Schema.safeParse(rawSeed).data ?? null : null;

  if (parsedSeed) {
    const authoritative = resolveAuthoritativeMonitorBundle({
      legacyConfig: null,
      bestieSeed: parsedSeed,
    });
    if (!authoritative) return null;
    return {
      config: authoritative.config,
      bestieSeed: authoritative.bestieSeed,
    };
  }

  const sourcesResult = await pool.query(
    `SELECT id, kind, url, label, status
     FROM monitor_sources
     WHERE config_id = $1
     ORDER BY created_at ASC`,
    [DEFAULT_CONFIG_ID],
  );

  const base = rowToConfig(row);
  const sources: SourceRegistryEntry[] = sourcesResult.rows.map((sourceRow) => ({
    id: sourceRow.id as string,
    kind: sourceRow.kind as SourceRegistryEntry["kind"],
    url: sourceRow.url as string,
    label: sourceRow.label as string,
    status: sourceRow.status as SourceRegistryEntry["status"],
  }));

  if (sources.length === 0) return null;

  const legacyConfig = { ...base, sources };
  const authoritative = resolveAuthoritativeMonitorBundle({
    legacyConfig,
    bestieSeed: null,
  });
  if (!authoritative) return null;

  return {
    config: authoritative.config,
    bestieSeed: authoritative.bestieSeed,
  };
}

async function replaceMonitorSources(
  client: PoolClient,
  sources: SourceRegistryEntry[],
): Promise<void> {
  await client.query(`DELETE FROM monitor_sources WHERE config_id = $1`, [
    DEFAULT_CONFIG_ID,
  ]);

  for (const source of sources) {
    await client.query(
      `INSERT INTO monitor_sources (config_id, id, kind, url, label, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        DEFAULT_CONFIG_ID,
        source.id,
        source.kind,
        source.url,
        source.label,
        source.status ?? "active",
      ],
    );
  }
}

export async function writeMonitorConfigToDb(
  config: MarketRadarMonitorConfig,
  bestieSeed?: BestieSeedV1 | null,
): Promise<void> {
  await ensureSchema();

  // Legacy-only writes still project a seed so future reads stay seed-first.
  const seed = bestieSeed ?? monitorConfigToBestieSeed(config);
  const projected = bestieSeedToMonitorConfig(seed);

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO monitor_configs (
        id, operator_summary, assumptions, principles, cadence,
        escalation_policy, since_hours, delivery, bestie_seed, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
      ON CONFLICT (id) DO UPDATE SET
        operator_summary = EXCLUDED.operator_summary,
        assumptions = EXCLUDED.assumptions,
        principles = EXCLUDED.principles,
        cadence = EXCLUDED.cadence,
        escalation_policy = EXCLUDED.escalation_policy,
        since_hours = EXCLUDED.since_hours,
        delivery = EXCLUDED.delivery,
        bestie_seed = EXCLUDED.bestie_seed,
        updated_at = now()`,
      [
        DEFAULT_CONFIG_ID,
        projected.operatorSummary,
        JSON.stringify(projected.assumptions),
        JSON.stringify(projected.principles),
        JSON.stringify(projected.cadence),
        projected.escalationPolicy,
        projected.sinceHours,
        JSON.stringify(projected.delivery ?? {}),
        JSON.stringify(seed),
      ],
    );

    await replaceMonitorSources(client, projected.sources);
  });
}

export async function writeBestieSeedToDb(seed: BestieSeedV1): Promise<MarketRadarMonitorConfig> {
  const config = bestieSeedToMonitorConfig(seed);
  await writeMonitorConfigToDb(config, seed);
  return config;
}

export async function persistCompleteMonitorRun(input: {
  trigger: RunTrigger;
  outcome: MarketRadarRunOutcome;
  digest: MarketRadarDigestOutput;
  rawObservations: Array<{
    sourceId?: string;
    sourceKind?: string;
    sourceUrl?: string;
    item: MarketRadarLiteItem["observation"];
  }>;
  deliveryTargets?: Array<{ channel: string; target: string }>;
}): Promise<PersistedRunRecord> {
  await ensureSchema();

  const runId = randomUUID();
  const digestId = randomUUID();

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO monitor_runs (
        id, config_id, trigger_kind, status, dropped_count, skipped_sources, notes, started_at, finished_at
      ) VALUES ($1,$2,$3,'completed',$4,$5,$6,now(),now())`,
      [
        runId,
        DEFAULT_CONFIG_ID,
        input.trigger,
        input.outcome.droppedCount,
        JSON.stringify(input.outcome.skippedSources ?? []),
        input.outcome.notes ?? null,
      ],
    );

    for (const observation of input.rawObservations) {
      await client.query(
        `INSERT INTO monitor_observations (
          id, run_id, source_id, source_kind, source_url,
          title, summary, url, published_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          randomUUID(),
          runId,
          observation.sourceId ?? null,
          observation.sourceKind ?? null,
          observation.sourceUrl ?? null,
          observation.item.title,
          observation.item.summary,
          observation.item.url ?? null,
          observation.item.publishedAt
            ? new Date(observation.item.publishedAt)
            : null,
        ],
      );
    }

    await client.query(
      `INSERT INTO monitor_digests (
        id, run_id, generated_at, escalations, morning_brief, digest_markdown, world_model
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        digestId,
        runId,
        input.digest.generatedAt,
        JSON.stringify(input.digest.escalations),
        JSON.stringify(input.digest.morningBrief),
        input.digest.digestMarkdown,
        JSON.stringify(input.digest.worldModel),
      ],
    );

    for (const target of input.deliveryTargets ?? []) {
      await client.query(
        `INSERT INTO notification_deliveries (
          id, digest_id, channel, target, status
        ) VALUES ($1,$2,$3,$4,'pending')`,
        [randomUUID(), digestId, target.channel, target.target],
      );
    }
  });

  return { runId, digestId };
}

export async function readLatestDigestFromDb(): Promise<MarketRadarDigestOutput | null> {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT d.generated_at, d.escalations, d.morning_brief, d.digest_markdown, d.world_model,
            r.dropped_count, r.skipped_sources, r.notes
     FROM monitor_digests d
     JOIN monitor_runs r ON r.id = d.run_id
     WHERE r.config_id = $1
     ORDER BY d.generated_at DESC
     LIMIT 1`,
    [DEFAULT_CONFIG_ID],
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0];

  return {
    schemaVersion: 1,
    generatedAt: new Date(row.generated_at as string).toISOString(),
    escalations: row.escalations as MarketRadarDigestOutput["escalations"],
    morningBrief: row.morning_brief as MarketRadarDigestOutput["morningBrief"],
    droppedCount: row.dropped_count as number,
    skippedSources: (row.skipped_sources as string[] | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    digestMarkdown: row.digest_markdown as string,
    worldModel: row.world_model as MarketRadarDigestOutput["worldModel"],
  };
}

export async function recordNotificationDelivery(input: {
  digestId: string;
  channel: string;
  target: string;
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  error?: string;
}): Promise<string> {
  await ensureSchema();
  const updated = await getPool().query(
    `UPDATE notification_deliveries
     SET status = $4,
         provider_message_id = $5,
         error = $6
     WHERE digest_id = $1 AND channel = $2 AND target = $3 AND status = 'pending'
     RETURNING id`,
    [
      input.digestId,
      input.channel,
      input.target,
      input.status,
      input.providerMessageId ?? null,
      input.error ?? null,
    ],
  );

  if (updated.rowCount && updated.rowCount > 0) {
    return updated.rows[0].id as string;
  }

  const id = randomUUID();
  await getPool().query(
    `INSERT INTO notification_deliveries (
      id, digest_id, channel, target, status, provider_message_id, error
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      input.digestId,
      input.channel,
      input.target,
      input.status,
      input.providerMessageId ?? null,
      input.error ?? null,
    ],
  );
  return id;
}

export async function createSourceRequest(input: {
  requestedKind: string;
  requestedDetail: string;
  context?: Record<string, unknown>;
}): Promise<string> {
  await ensureSchema();
  const id = randomUUID();
  await getPool().query(
    `INSERT INTO source_requests (id, requested_kind, requested_detail, context)
     VALUES ($1,$2,$3,$4)`,
    [
      id,
      input.requestedKind,
      input.requestedDetail,
      input.context ? JSON.stringify(input.context) : null,
    ],
  );
  return id;
}
