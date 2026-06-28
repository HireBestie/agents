import { isDatabaseConfigured, getPool } from "./client";
import { ensureSchema } from "./migrate";

export type WatchRoomSnapshot = {
  sources: Array<{
    id: string;
    kind: string;
    url: string;
    label: string;
    status: string;
    executable: boolean;
  }>;
  lastRun: {
    id: string;
    trigger: string;
    status: string;
    droppedCount: number;
    finishedAt: string;
  } | null;
  nextRunLabel: string;
  deliveries: Array<{
    channel: string;
    target: string;
    status: string;
    error: string | null;
    createdAt: string;
  }>;
  sourceRequests: Array<{
    id: string;
    kind: string;
    detail: string;
    status: string;
    createdAt: string;
  }>;
};

function formatNextRun(
  frequency: string,
  hourUtc: number,
  dayOfWeekUtc: number,
): string {
  if (frequency === "manual") return "Manual — run on demand";
  const day =
    frequency === "weekly"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeekUtc]
      : null;
  const time = `${String(hourUtc).padStart(2, "0")}:00 UTC`;
  return frequency === "weekly"
    ? `Weekly · ${day} ${time}`
    : `Daily · ${time}`;
}

export async function readWatchRoomSnapshot(): Promise<WatchRoomSnapshot | null> {
  if (!isDatabaseConfigured()) return null;

  await ensureSchema();
  const pool = getPool();

  const configResult = await pool.query(
    `SELECT cadence FROM monitor_configs WHERE id = 'default'`,
  );
  const cadence = (configResult.rows[0]?.cadence ?? {
    frequency: "daily",
    hourUtc: 7,
    dayOfWeekUtc: 1,
  }) as { frequency: string; hourUtc: number; dayOfWeekUtc: number };

  const sourcesResult = await pool.query(
    `SELECT id, kind, url, label, status FROM monitor_sources
     WHERE config_id = 'default' ORDER BY created_at ASC`,
  );

  const lastRunResult = await pool.query(
    `SELECT id, trigger_kind, status, dropped_count, finished_at
     FROM monitor_runs WHERE config_id = 'default'
     ORDER BY finished_at DESC NULLS LAST LIMIT 1`,
  );

  const deliveriesResult = await pool.query(
    `SELECT nd.channel, nd.target, nd.status, nd.error, nd.created_at
     FROM notification_deliveries nd
     JOIN monitor_digests d ON d.id = nd.digest_id
     JOIN monitor_runs r ON r.id = d.run_id
     WHERE r.config_id = 'default'
     ORDER BY nd.created_at DESC LIMIT 10`,
  );

  const requestsResult = await pool.query(
    `SELECT id, requested_kind, requested_detail, status, created_at
     FROM source_requests ORDER BY created_at DESC LIMIT 10`,
  );

  const executableKinds = new Set(["rss", "website", "sitemap"]);

  return {
    sources: sourcesResult.rows.map((row) => ({
      id: row.id as string,
      kind: row.kind as string,
      url: row.url as string,
      label: row.label as string,
      status: row.status as string,
      executable: executableKinds.has(row.kind as string),
    })),
    lastRun:
      lastRunResult.rowCount ?
        {
          id: lastRunResult.rows[0].id as string,
          trigger: lastRunResult.rows[0].trigger_kind as string,
          status: lastRunResult.rows[0].status as string,
          droppedCount: lastRunResult.rows[0].dropped_count as number,
          finishedAt: new Date(
            lastRunResult.rows[0].finished_at as string,
          ).toISOString(),
        }
      : null,
    nextRunLabel: formatNextRun(
      cadence.frequency,
      cadence.hourUtc,
      cadence.dayOfWeekUtc,
    ),
    deliveries: deliveriesResult.rows.map((row) => ({
      channel: row.channel as string,
      target: row.target as string,
      status: row.status as string,
      error: (row.error as string | null) ?? null,
      createdAt: new Date(row.created_at as string).toISOString(),
    })),
    sourceRequests: requestsResult.rows.map((row) => ({
      id: row.id as string,
      kind: row.requested_kind as string,
      detail: row.requested_detail as string,
      status: row.status as string,
      createdAt: new Date(row.created_at as string).toISOString(),
    })),
  };
}
