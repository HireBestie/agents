import { randomUUID } from "node:crypto";

import { getPool } from "./client";
import { ensureSchema } from "./migrate";

export async function createCoverageRequest(input: {
  painId: string;
  requestedCapability: string;
  context?: Record<string, unknown>;
  contactEmail?: string;
}): Promise<{ id: string; requestCount: number; created: boolean }> {
  await ensureSchema();
  const updated = await getPool().query(
    `UPDATE coverage_requests
     SET request_count = request_count + 1,
         context = COALESCE($3, context),
         updated_at = now()
     WHERE pain_id = $1
       AND requested_capability = $2
       AND COALESCE(contact_email, '') = COALESCE($4, '')
     RETURNING id, request_count`,
    [
      input.painId,
      input.requestedCapability,
      input.context ? JSON.stringify(input.context) : null,
      input.contactEmail ?? null,
    ],
  );

  if (updated.rowCount && updated.rowCount > 0) {
    return {
      id: updated.rows[0].id as string,
      requestCount: updated.rows[0].request_count as number,
      created: false,
    };
  }

  const id = randomUUID();
  const inserted = await getPool().query(
    `INSERT INTO coverage_requests (
      id, pain_id, requested_capability, context, contact_email
    )
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, request_count`,
    [
      id,
      input.painId,
      input.requestedCapability,
      input.context ? JSON.stringify(input.context) : null,
      input.contactEmail ?? null,
    ],
  );
  return {
    id: inserted.rows[0].id as string,
    requestCount: inserted.rows[0].request_count as number,
    created: true,
  };
}
