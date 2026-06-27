import { generateObject } from "ai";
import { z } from "zod";

import { assertGatewayAuth, resolveMarketRadarModel } from "./gateway-model";
import {
  MarketRadarImpactAssessmentSchema,
  MarketRadarRecommendationSchema,
  type MarketRadarObservation,
  type MarketRadarRunOutcome,
  type MarketRadarRunRequest,
} from "./lite-schema";
import { splitDigest } from "./digest";
import {
  fetchFromSourceRegistry,
  toLiteObservations,
} from "./sources/fetch-registry";
import type { FetchedObservation } from "./sources/types";
import { SourceRegistryEntrySchema } from "./monitor-config";
import { fetchPublicObservations } from "./fetch-sources";

const InterpretKeeperSchema = z.object({
  observationIndex: z.number().int().nonnegative(),
  impact: MarketRadarImpactAssessmentSchema,
  recommendation: MarketRadarRecommendationSchema,
});

const InterpretBatchSchema = z.object({
  items: z.array(InterpretKeeperSchema).max(8),
  droppedCount: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const MAX_OBSERVATIONS = 12;

function hydrateKeepers(
  sample: Array<{ index: number; observation: MarketRadarObservation }>,
  rawItems: z.infer<typeof InterpretBatchSchema>["items"],
) {
  const byIndex = new Map(sample.map((entry) => [entry.index, entry.observation]));
  const hydrated = [];
  for (const item of rawItems) {
    const observation = byIndex.get(item.observationIndex);
    if (!observation) continue;
    hydrated.push({
      observation,
      impact: item.impact,
      recommendation: item.recommendation,
    });
  }
  return hydrated;
}

function legacySourcesToRegistry(sources: string[]) {
  return sources.map((url, index) =>
    SourceRegistryEntrySchema.parse({
      id: `legacy-${index + 1}`,
      kind: "rss",
      url,
      label: new URL(url).hostname,
      status: "active",
    }),
  );
}

async function loadObservations(input: MarketRadarRunRequest): Promise<{
  observations: MarketRadarObservation[];
  rawObservations: FetchedObservation[];
  skippedSources: string[];
}> {
  if (input.sourceRegistry?.length) {
    const fetched = await fetchFromSourceRegistry(
      input.sourceRegistry,
      input.sinceHours,
    );
    return {
      observations: toLiteObservations(fetched.observations),
      rawObservations: fetched.observations,
      skippedSources: fetched.skippedSources,
    };
  }

  const registry = legacySourcesToRegistry(input.sources ?? []);
  const fetched = await fetchFromSourceRegistry(registry, input.sinceHours);
  if (fetched.observations.length > 0) {
    return {
      observations: toLiteObservations(fetched.observations),
      rawObservations: fetched.observations,
      skippedSources: fetched.skippedSources,
    };
  }

  const legacy = await fetchPublicObservations(input.sources ?? [], input.sinceHours);
  return {
    observations: legacy.observations,
    rawObservations: legacy.observations.map((observation, index) => ({
      ...observation,
      sourceId: `legacy-${index + 1}`,
      sourceKind: "rss" as const,
      sourceUrl: input.sources?.[index] ?? observation.url ?? "",
    })),
    skippedSources: legacy.skippedSources,
  };
}

export type MarketRadarRunResult = {
  outcome: MarketRadarRunOutcome;
  rawObservations: FetchedObservation[];
};

export async function runMarketRadar(
  input: MarketRadarRunRequest,
): Promise<MarketRadarRunResult> {
  assertGatewayAuth();
  const modelId = resolveMarketRadarModel();

  const { observations, rawObservations, skippedSources } =
    await loadObservations(input);

  if (observations.length === 0) {
    return {
      rawObservations,
      outcome: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        worldModel: {
          operatorSummary: input.operatorSummary,
          assumptions: input.assumptions,
          principles: input.principles,
        },
        items: [],
        droppedCount: 0,
        skippedSources,
        notes:
          "No fetchable public items. Check source registry URLs and adapter kinds.",
      },
    };
  }

  const sample = observations.slice(0, MAX_OBSERVATIONS).map((observation, index) => ({
    index,
    observation,
  }));

  const { object } = await generateObject({
    model: modelId,
    schema: InterpretBatchSchema,
    prompt: `You are Market Radar Bestie (lite / ephemeral). Interpret public observations against the operator's lite world model.

Operator summary:
${input.operatorSummary}

Assumptions (future-resolvable bets):
${input.assumptions.map((a) => `- ${a}`).join("\n")}

Principles (decision rules / worldview):
${input.principles.map((p) => `- ${p}`).join("\n")}

Observations (indexed — return observationIndex only, never invent observations):
${JSON.stringify(
  sample.map(({ index, observation }) => ({ index, ...observation })),
  null,
  2,
)}

Rules:
- Return observationIndex referencing the list above. Do NOT invent titles, URLs, or summaries.
- Keep only items that touch at least one assumption AND one principle.
- Evidence must quote or paraphrase the indexed observation summary only.
- droppedCount = observations you rejected as noise/off-topic/stale.
- Prefer investigate/brief actions for threats and opportunities.
- Return at most 8 keeper items.`,
  });

  const items = hydrateKeepers(sample, object.items);

  return {
    rawObservations,
    outcome: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      worldModel: {
        operatorSummary: input.operatorSummary,
        assumptions: input.assumptions,
        principles: input.principles,
      },
      items,
      droppedCount:
        object.droppedCount + Math.max(0, observations.length - sample.length),
      notes: object.notes,
      skippedSources,
    },
  };
}

export { splitDigest };
