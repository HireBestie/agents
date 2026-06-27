import { z } from "zod";

export const SourceKindSchema = z.enum([
  "rss",
  "sitemap",
  "website",
  "search_query",
  "tender_feed",
  "regulatory_feed",
]);

export const CadenceFrequencySchema = z.enum(["daily", "weekly", "manual"]);

export const DeliveryConfigSchema = z.object({
  email: z.string().email().optional(),
  slackWebhookUrl: z.string().url().optional(),
  telegramChatId: z.string().min(1).optional(),
});

export const SourceRegistryEntrySchema = z.object({
  id: z.string().min(1),
  kind: SourceKindSchema,
  url: z.string().url(),
  label: z.string().min(1),
  status: z.enum(["active", "disabled", "error"]).default("active"),
});

export const MarketRadarCadenceSchema = z.object({
  label: z.string().default("Daily watch"),
  frequency: CadenceFrequencySchema.default("daily"),
  hourUtc: z.number().int().min(0).max(23).default(7),
  dayOfWeekUtc: z.number().int().min(0).max(6).default(1),
});

export const MarketRadarMonitorConfigSchema = z.object({
  schemaVersion: z.literal(1),
  operatorSummary: z.string().min(1).max(4_000),
  assumptions: z.array(z.string().min(1).max(500)).min(1).max(20),
  principles: z.array(z.string().min(1).max(500)).min(1).max(20),
  sources: z.array(SourceRegistryEntrySchema).min(1).max(20),
  cadence: MarketRadarCadenceSchema.default({
    label: "Daily watch",
    frequency: "daily",
    hourUtc: 7,
    dayOfWeekUtc: 1,
  }),
  escalationPolicy: z
    .enum(["threat_and_opportunity", "threat_only", "all_keepers"])
    .default("threat_and_opportunity"),
  sinceHours: z.number().int().positive().max(168).default(48),
  delivery: DeliveryConfigSchema.default({}),
});

export type SourceKind = z.infer<typeof SourceKindSchema>;
export type SourceRegistryEntry = z.infer<typeof SourceRegistryEntrySchema>;
export type MarketRadarMonitorConfig = z.infer<
  typeof MarketRadarMonitorConfigSchema
>;

export const EXECUTABLE_SOURCE_KINDS = ["rss", "website", "sitemap"] as const;

export type ExecutableSourceKind = (typeof EXECUTABLE_SOURCE_KINDS)[number];

export function isExecutableSourceKind(
  kind: SourceKind,
): kind is ExecutableSourceKind {
  return EXECUTABLE_SOURCE_KINDS.includes(kind as ExecutableSourceKind);
}

export function assertActiveSourcesAreExecutable(
  sources: SourceRegistryEntry[],
): void {
  const invalid = sources.filter(
    (source) => source.status === "active" && !isExecutableSourceKind(source.kind),
  );
  if (invalid.length === 0) return;

  const kinds = [...new Set(invalid.map((source) => source.kind))].join(", ");
  throw new Error(
    `Active monitor sources must use executable adapters (${EXECUTABLE_SOURCE_KINDS.join(", ")}). Invalid active kinds: ${kinds}. Disable them or submit a source request.`,
  );
}

export function filterExecutableActiveSources(
  sources: SourceRegistryEntry[],
): SourceRegistryEntry[] {
  return sources.filter(
    (source) => source.status === "active" && isExecutableSourceKind(source.kind),
  );
}

export function shouldRunScheduledMonitor(
  cadence: MarketRadarMonitorConfig["cadence"],
  now = new Date(),
): boolean {
  if (cadence.frequency === "manual") return false;
  if (now.getUTCHours() !== cadence.hourUtc) return false;
  if (cadence.frequency === "weekly") {
    return now.getUTCDay() === cadence.dayOfWeekUtc;
  }
  return true;
}

export function monitorConfigToRunRequest(
  config: MarketRadarMonitorConfig,
  runToken?: string,
) {
  return {
    operatorSummary: config.operatorSummary,
    assumptions: config.assumptions,
    principles: config.principles,
    sourceRegistry: filterExecutableActiveSources(config.sources),
    sinceHours: config.sinceHours,
    ...(runToken ? { runToken } : {}),
  };
}
