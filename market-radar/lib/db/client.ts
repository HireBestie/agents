import { Pool } from "@neondatabase/serverless";

let pool: Pool | null = null;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "POSTGRES_URL is not configured. Add Neon Postgres via Vercel Marketplace for durable monitor persistence.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL?.trim());
}

export function requireDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError();
  }
}

export function getPool(): Pool {
  const connectionString = process.env.POSTGRES_URL?.trim();
  if (!connectionString) {
    throw new DatabaseNotConfiguredError();
  }

  if (!pool) {
    pool = new Pool({ connectionString });
  }

  return pool;
}
