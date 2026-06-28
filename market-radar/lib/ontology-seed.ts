/**
 * Seed authority convention (v0.5.1+):
 *
 * If `bestie_seed` exists in persistence, it is AUTHORITATIVE.
 * Legacy columns (`operator_summary`, `assumptions`, `principles`) and
 * `monitor_sources` rows are a RUNTIME PROJECTION via bestieSeedToMonitorConfig().
 *
 * Never update legacy columns without updating bestie_seed in the same transaction.
 * Reads must use resolveAuthoritativeMonitorBundle() — seed-first, legacy fallback.
 */

import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { MarketRadarMonitorConfig } from "./monitor-config";
import {
  SourceRegistryEntrySchema,
  type SourceRegistryEntry,
} from "./monitor-config";

export const AudiencePainIdSchema = z.enum([
  "found_out_too_late",
  "nobodys_job",
  "cant_translate_to_action",
  "saw_but_froze",
  "rfp_rfq_deadline",
  "competitor_move_missed",
  "noise_without_signal",
]);

export type AudiencePainId = z.infer<typeof AudiencePainIdSchema>;

export const CoverageLevelSchema = z.enum(["none", "partial", "total"]);

export type CoverageLevel = z.infer<typeof CoverageLevelSchema>;

const SeedAssumptionSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1).max(500),
  rationale: z.string().max(500).optional(),
  originPainIds: z.array(AudiencePainIdSchema).default([]),
});

const SeedPrincipleSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1).max(500),
  rationale: z.string().max(500).optional(),
  originPainIds: z.array(AudiencePainIdSchema).default([]),
});

const SeedMonitorSchema = z.object({
  id: z.string().min(1),
  assumptionId: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).max(20),
  cadence: z.enum(["manual", "daily", "weekly"]).default("daily"),
  escalationPolicy: z
    .enum(["threat_and_opportunity", "threat_only", "all_keepers"])
    .default("threat_and_opportunity"),
});

const DeliveryDestinationSchema = z.object({
  kind: z.enum(["email", "slack", "telegram", "whatsapp"]),
  status: z.enum(["active", "managed_only", "request_support"]),
  target: z.string().optional(),
});

export const BestieSeedV1Schema = z.object({
  schemaVersion: z.literal(1),
  preset: z.literal("market_radar"),
  /** Set when user confirms the compiled seed (stable IDs applied at confirm). */
  confirmedAt: z.string().datetime().optional(),
  seedRevision: z.number().int().positive().default(1),
  elicitationContext: z
    .object({
      summary: z.string().max(4_000).optional(),
      answers: z.array(
        z.object({
          questionId: z.string().min(1),
          answer: z.string().min(1).max(2_000),
          mappedPainIds: z.array(AudiencePainIdSchema).default([]),
        }),
      ),
    })
    .optional(),
  worldModelSeed: z.object({
    assumptions: z.array(SeedAssumptionSchema).min(1).max(20),
  }),
  worldviewSeed: z.object({
    principles: z.array(SeedPrincipleSchema).min(1).max(20),
  }),
  sourceSeed: z.object({
    sources: z.array(SourceRegistryEntrySchema).max(20),
  }),
  monitorSeed: z.object({
    monitors: z.array(SeedMonitorSchema).min(1).max(20),
  }),
  deliverySeed: z.object({
    destinations: z.array(DeliveryDestinationSchema).min(1).max(8),
  }),
});

export type BestieSeedV1 = z.infer<typeof BestieSeedV1Schema>;

export const PainCoverageItemSchema = z.object({
  painId: AudiencePainIdSchema,
  coverage: CoverageLevelSchema,
  supportedNow: z.array(z.string()),
  missing: z.array(z.string()),
  managedOnly: z.array(z.string()),
  requestable: z.boolean(),
});

export type PainCoverageItem = z.infer<typeof PainCoverageItemSchema>;

export const PainCoverageAssessmentV1Schema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(PainCoverageItemSchema),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export type PainCoverageAssessmentV1 = z.infer<
  typeof PainCoverageAssessmentV1Schema
>;

export type AuthoritativeMonitorBundle = {
  config: MarketRadarMonitorConfig;
  bestieSeed: BestieSeedV1 | null;
  /** True when config was derived from bestie_seed, not legacy columns. */
  seedAuthoritative: boolean;
};

/** Generic/demo feeds that do not satisfy pain-specific coverage as "total". */
export const GENERIC_PROBE_SOURCE_PATTERNS = [
  /feeds\.bbci\.co\.uk/i,
  /news\.google\.com/i,
];

export function isGenericProbeSource(source: SourceRegistryEntry): boolean {
  if (/public news probe/i.test(source.label)) return true;

  try {
    const host = new URL(source.url).hostname.toLowerCase();
    if (host === "example.com") return true;
    if (host.endsWith(".bbci.co.uk")) return true;
    if (host === "news.google.com") return true;
  } catch {
    return GENERIC_PROBE_SOURCE_PATTERNS.some(
      (pattern) => pattern.test(source.url) || pattern.test(source.label),
    );
  }

  return GENERIC_PROBE_SOURCE_PATTERNS.some(
    (pattern) => pattern.test(source.url) || pattern.test(source.label),
  );
}

export function hasRelevantActiveSources(seed: BestieSeedV1): boolean {
  return seed.sourceSeed.sources.some(
    (s) => s.status === "active" && !isGenericProbeSource(s),
  );
}

export function validateSeedForRun(seed: BestieSeedV1): void {
  const parsed = BestieSeedV1Schema.parse(seed);
  const active = parsed.sourceSeed.sources.filter((s) => s.status === "active");
  if (active.length === 0) {
    throw new Error(
      "Add at least one watch source before running. Generic probe feeds are not auto-added.",
    );
  }
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function stableSeedId(prefix: string, key: string): string {
  const hash = createHash("sha256").update(normalizeKey(key)).digest("hex").slice(0, 12);
  return `${prefix}-${hash}`;
}

/** Draft IDs during compile; replaced with stable hashes on confirm. */
export function newDraftSeedId(prefix: string): string {
  return `${prefix}-draft-${randomUUID().slice(0, 8)}`;
}

export function stabilizeSeedIds(seed: BestieSeedV1): BestieSeedV1 {
  const assumptionIdMap = new Map<string, string>();
  const assumptions = seed.worldModelSeed.assumptions.map((a) => {
    const id = stableSeedId("assumption", a.statement);
    assumptionIdMap.set(a.id, id);
    return { ...a, id };
  });

  const principles = seed.worldviewSeed.principles.map((p) => ({
    ...p,
    id: stableSeedId("principle", p.statement),
  }));

  const sourceIdMap = new Map<string, string>();
  const sources = seed.sourceSeed.sources.map((s) => {
    const id = stableSeedId("source", s.url);
    sourceIdMap.set(s.id, id);
    return { ...s, id };
  });

  const monitors = seed.monitorSeed.monitors.map((m, index) => ({
    ...m,
    id: stableSeedId("monitor", `${m.assumptionId}:${index}`),
    assumptionId: assumptionIdMap.get(m.assumptionId) ?? m.assumptionId,
    sourceIds: m.sourceIds.map((sid) => sourceIdMap.get(sid) ?? sid),
  }));

  return BestieSeedV1Schema.parse({
    ...seed,
    worldModelSeed: { assumptions },
    worldviewSeed: { principles },
    sourceSeed: { sources },
    monitorSeed: { monitors },
  });
}

export function confirmBestieSeed(seed: BestieSeedV1): BestieSeedV1 {
  const stabilized = stabilizeSeedIds(seed);
  return BestieSeedV1Schema.parse({
    ...stabilized,
    confirmedAt: new Date().toISOString(),
    seedRevision: (seed.seedRevision ?? 0) + 1,
  });
}

function primaryCadence(seed: BestieSeedV1): "manual" | "daily" | "weekly" {
  const cadences = seed.monitorSeed.monitors.map((m) => m.cadence);
  if (cadences.includes("daily")) return "daily";
  if (cadences.includes("weekly")) return "weekly";
  return "manual";
}

function primaryEscalation(
  seed: BestieSeedV1,
): MarketRadarMonitorConfig["escalationPolicy"] {
  return seed.monitorSeed.monitors[0]?.escalationPolicy ?? "threat_and_opportunity";
}

/** Elicitation narrative for runtime prompts — not persisted as model truth when seed exists. */
export function elicitationSummary(seed: BestieSeedV1): string {
  if (seed.elicitationContext?.summary?.trim()) {
    return seed.elicitationContext.summary.trim();
  }
  const answers = seed.elicitationContext?.answers ?? [];
  if (answers.length === 0) {
    return seed.worldModelSeed.assumptions.map((a) => a.statement).join("; ");
  }
  return answers.map((a) => a.answer).join(" ").slice(0, 4_000);
}

export function bestieSeedToMonitorConfig(seed: BestieSeedV1): MarketRadarMonitorConfig {
  const parsed = BestieSeedV1Schema.parse(seed);
  const cadenceFrequency = primaryCadence(parsed);
  const emailDest = parsed.deliverySeed.destinations.find(
    (d) => d.kind === "email" && d.status === "active" && d.target,
  );

  return {
    schemaVersion: 1,
    operatorSummary: elicitationSummary(parsed),
    assumptions: parsed.worldModelSeed.assumptions.map((a) => a.statement),
    principles: parsed.worldviewSeed.principles.map((p) => p.statement),
    sources: parsed.sourceSeed.sources,
    cadence: {
      label: cadenceFrequency === "weekly" ? "Weekly watch" : "Daily watch",
      frequency: cadenceFrequency,
      hourUtc: 7,
      dayOfWeekUtc: 1,
    },
    escalationPolicy: primaryEscalation(parsed),
    sinceHours: 48,
    delivery: emailDest?.target ? { email: emailDest.target } : {},
  };
}

export function bestieSeedToRunRequest(seed: BestieSeedV1) {
  validateSeedForRun(seed);
  const config = bestieSeedToMonitorConfig(seed);
  return {
    operatorSummary: elicitationSummary(seed),
    assumptions: config.assumptions,
    principles: config.principles,
    sourceRegistry: config.sources.filter((s) => s.status === "active"),
    sinceHours: config.sinceHours,
  };
}

/**
 * Seed-first read: if bestie_seed parses, it is authoritative.
 * Legacy flat config is fallback for unmigrated v1 rows only.
 */
export function resolveAuthoritativeMonitorBundle(input: {
  legacyConfig: MarketRadarMonitorConfig | null;
  bestieSeed: BestieSeedV1 | null;
}): AuthoritativeMonitorBundle | null {
  const parsedSeed = input.bestieSeed
    ? BestieSeedV1Schema.safeParse(input.bestieSeed).data ?? null
    : null;

  if (parsedSeed) {
    return {
      config: bestieSeedToMonitorConfig(parsedSeed),
      bestieSeed: parsedSeed,
      seedAuthoritative: true,
    };
  }

  if (input.legacyConfig) {
    return {
      config: input.legacyConfig,
      bestieSeed: null,
      seedAuthoritative: false,
    };
  }

  return null;
}

export function monitorConfigToBestieSeed(
  config: MarketRadarMonitorConfig,
  elicitationContext?: BestieSeedV1["elicitationContext"],
): BestieSeedV1 {
  const assumptions = config.assumptions.map((statement) => ({
    id: stableSeedId("assumption", statement),
    statement,
    originPainIds: [] as AudiencePainId[],
  }));

  const principles = config.principles.map((statement) => ({
    id: stableSeedId("principle", statement),
    statement,
    originPainIds: [] as AudiencePainId[],
  }));

  const sources: SourceRegistryEntry[] = config.sources;
  const assumptionId = assumptions[0]?.id ?? stableSeedId("assumption", "default");

  const destinations: BestieSeedV1["deliverySeed"]["destinations"] = [
    {
      kind: "email",
      status: config.delivery.email ? "active" : "request_support",
      target: config.delivery.email,
    },
    { kind: "slack", status: "managed_only" },
    { kind: "telegram", status: "managed_only" },
    { kind: "whatsapp", status: "managed_only" },
  ];

  return BestieSeedV1Schema.parse({
    schemaVersion: 1,
    preset: "market_radar",
    seedRevision: 1,
    elicitationContext: elicitationContext ?? {
      summary: config.operatorSummary,
      answers: [],
    },
    worldModelSeed: { assumptions },
    worldviewSeed: { principles },
    sourceSeed: { sources },
    monitorSeed: {
      monitors: [
        {
          id: stableSeedId("monitor", "primary"),
          assumptionId,
          sourceIds: sources.map((s) => s.id),
          cadence: config.cadence.frequency,
          escalationPolicy: config.escalationPolicy,
        },
      ],
    },
    deliverySeed: { destinations },
  });
}

export function createEmptySeedFromAnswers(
  answers: Array<{ questionId: string; answer: string; mappedPainIds?: AudiencePainId[] }>,
): Partial<BestieSeedV1> {
  return {
    schemaVersion: 1,
    preset: "market_radar",
    seedRevision: 1,
    elicitationContext: {
      summary: answers.map((a) => a.answer).join("\n").slice(0, 4_000),
      answers: answers.map((a) => ({
        questionId: a.questionId,
        answer: a.answer,
        mappedPainIds: a.mappedPainIds ?? [],
      })),
    },
  };
}

/** @deprecated Use newDraftSeedId during compile; stableSeedId after confirm. */
export function newSeedId(prefix: string): string {
  return newDraftSeedId(prefix);
}
