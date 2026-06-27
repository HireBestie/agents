import { z } from "zod";

import { MAX_SOURCES } from "./safe-url";
import { SourceRegistryEntrySchema } from "./monitor-config";

const lineItem = z.string().min(1).max(500);

export const MarketRadarObservationSchema = z.object({
  source: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  url: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
});

export const MarketRadarImpactAssessmentSchema = z.object({
  assumption: z.string().min(1),
  relation: z.enum([
    "supports",
    "contradicts",
    "activates",
    "inhibits",
    "context_only",
  ]),
  stance: z.enum(["threat", "opportunity", "mixed", "watch_only"]),
  mechanism: z.string().min(1),
  confidence: z.number().min(0).max(1),
  affectedPrinciples: z.array(z.string().min(1)).min(1),
  evidence: z.string().min(1),
  warrant: z.string().min(1),
  rebuttal: z.string().min(1).optional(),
});

export const MarketRadarRecommendationSchema = z.object({
  action: z.enum(["brief", "investigate", "simulate", "snooze", "ignore"]),
  rationale: z.string().min(1),
});

export const MarketRadarLiteItemSchema = z.object({
  observation: MarketRadarObservationSchema,
  impact: MarketRadarImpactAssessmentSchema,
  recommendation: MarketRadarRecommendationSchema,
});

export const MarketRadarRunRequestSchema = z
  .object({
    operatorSummary: z.string().min(1).max(4_000),
    assumptions: z.array(lineItem).min(1).max(20),
    principles: z.array(lineItem).min(1).max(20),
    sources: z.array(z.string().url()).max(MAX_SOURCES).optional(),
    sourceRegistry: z.array(SourceRegistryEntrySchema).max(MAX_SOURCES).optional(),
    sinceHours: z.number().int().positive().max(168).default(48),
    runToken: z.string().min(1).max(256).optional(),
  })
  .refine(
    (value) =>
      (value.sources?.length ?? 0) > 0 || (value.sourceRegistry?.length ?? 0) > 0,
    { message: "Provide sources or sourceRegistry." },
  );

export const MarketRadarRunOutcomeSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  worldModel: z.object({
    operatorSummary: z.string().min(1),
    assumptions: z.array(z.string().min(1)).min(1),
    principles: z.array(z.string().min(1)).min(1),
  }),
  items: z.array(MarketRadarLiteItemSchema),
  droppedCount: z.number().int().nonnegative(),
  notes: z.string().optional(),
  skippedSources: z.array(z.string()).optional(),
});

export type MarketRadarObservation = z.infer<typeof MarketRadarObservationSchema>;
export type MarketRadarLiteItem = z.infer<typeof MarketRadarLiteItemSchema>;
export type MarketRadarRunOutcome = z.infer<typeof MarketRadarRunOutcomeSchema>;
export type MarketRadarRunRequest = z.infer<typeof MarketRadarRunRequestSchema>;
