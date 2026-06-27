import { getPool } from "./client";
import { MONITOR_SCHEMA_SQL } from "./schema-content";

let migrated = false;

export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  await getPool().query(MONITOR_SCHEMA_SQL);
  migrated = true;
}
