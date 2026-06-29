import { isDatabaseConfigured, getPool } from "./db/client";
import { readBestieSeed, readMonitorConfig } from "./persistence";

export type ConnectionCheckId = "ai" | "memory" | "schedule" | "email";

export const REQUIRED_CONNECTION_IDS: ConnectionCheckId[] = [
  "ai",
  "memory",
  "schedule",
];

export type ConnectionCheck = {
  id: ConnectionCheckId;
  label: string;
  connected: boolean;
  detail: string;
  /** When false, connection is progressive (e.g. email) and does not block briefing. */
  required?: boolean;
  /** Human-facing hint — vendor names only in advanced drawer */
  hint?: string;
  connectUrl?: string;
  automatic?: boolean;
};

function vercelProjectSettingsUrl(): string | undefined {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!projectId) return "https://vercel.com/dashboard";
  if (teamId) {
    return `https://vercel.com/${teamId}/${process.env.VERCEL_PROJECT_NAME ?? "market-radar-bestie"}/settings/environment-variables`;
  }
  return `https://vercel.com/dashboard`;
}

async function memoryReachable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export function computeDeployReadiness(checks: ConnectionCheck[]) {
  const requiredChecks = checks.filter((check) => check.required !== false);
  const infraReady = requiredChecks.every((check) => check.connected);
  const aiConnected = checks.find((check) => check.id === "ai")?.connected ?? false;
  const memoryConnected =
    checks.find((check) => check.id === "memory")?.connected ?? false;
  const emailReady =
    checks.find((check) => check.id === "email")?.connected ?? false;

  return {
    infraReady,
    /** Enough to start the interview and compile (AI Gateway). */
    canBrief: aiConnected,
    /** Enough to persist a confirmed watch plan. */
    canPersist: aiConnected && memoryConnected,
    emailReady,
  };
}

export async function getDeployStatus() {
  const onVercel = Boolean(process.env.VERCEL);
  const settingsUrl = vercelProjectSettingsUrl();

  const hasOidc = Boolean(process.env.VERCEL_OIDC_TOKEN?.trim());
  const hasGatewayKey = Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
  const aiConnected = hasOidc || hasGatewayKey;

  const memoryConfigured = isDatabaseConfigured();
  const memoryConnected =
    memoryConfigured ? await memoryReachable() : !onVercel;

  const scheduleConnected =
    onVercel || Boolean(process.env.CRON_SECRET?.trim());

  const emailConnected =
    Boolean(process.env.RESEND_API_KEY?.trim()) &&
    Boolean(process.env.MARKET_RADAR_FROM_EMAIL?.trim());

  const config = await readMonitorConfig().catch(() => null);
  const seed = await readBestieSeed().catch(() => null);

  const checks: ConnectionCheck[] = [
    {
      id: "ai",
      label: "AI connected",
      connected: aiConnected,
      required: true,
      detail: aiConnected
        ? hasOidc
          ? "Ready via Vercel AI Gateway"
          : "Ready via API key"
        : "Bestie needs AI to interview and rank signals",
      hint: "AI Gateway",
      automatic: hasOidc,
      connectUrl: onVercel
        ? "https://vercel.com/docs/ai-gateway"
        : settingsUrl,
    },
    {
      id: "memory",
      label: "Memory connected",
      connected: memoryConnected,
      required: true,
      detail: memoryConnected
        ? "Monitor config and digests persist"
        : "Add database memory so training sticks",
      hint: "Postgres",
      connectUrl: onVercel
        ? "https://vercel.com/integrations/neon"
        : settingsUrl,
    },
    {
      id: "schedule",
      label: "Schedule active",
      connected: scheduleConnected,
      required: true,
      detail: scheduleConnected
        ? onVercel
          ? "Daily watch at 07:00 UTC"
          : "Cron auth configured"
        : "Enable automatic daily scans",
      hint: "Cron",
      automatic: onVercel,
      connectUrl: settingsUrl,
    },
    {
      id: "email",
      label: "Email delivery ready",
      connected: emailConnected,
      required: false,
      detail: emailConnected
        ? "Digests can reach your inbox"
        : "Optional for now — web digest works without email",
      hint: "Resend",
      connectUrl: onVercel
        ? "https://vercel.com/integrations/resend"
        : settingsUrl,
    },
  ];

  const readiness = computeDeployReadiness(checks);
  const trainingComplete = Boolean(
    seed?.worldModelSeed.assumptions.length ||
      (config?.operatorSummary && config.sources.length),
  );

  return {
    checks,
    onVercel,
    ...readiness,
    trainingComplete,
    hasDigest: false as boolean,
    configSaved: Boolean(config),
  };
}
