import type { MarketRadarObservation } from "../lite-schema";
import type { SourceRegistryEntry } from "../monitor-config";
import { getSourceAdapter } from "./registry";
import type { FetchedObservation } from "./types";

export async function fetchFromSourceRegistry(
  sources: SourceRegistryEntry[],
  sinceHours: number,
): Promise<{
  observations: FetchedObservation[];
  skippedSources: string[];
}> {
  const observations: FetchedObservation[] = [];
  const skippedSources: string[] = [];

  for (const entry of sources) {
    if (entry.status === "disabled") continue;

    const adapter = getSourceAdapter(entry.kind);
    if (!adapter) {
      skippedSources.push(`${entry.label} (${entry.kind} — no adapter yet)`);
      continue;
    }

    const result = await adapter.fetch({ entry, sinceHours });
    if (result.skipped || result.observations.length === 0) {
      skippedSources.push(entry.url);
      continue;
    }

    for (const observation of result.observations) {
      observations.push({
        ...observation,
        sourceId: entry.id,
        sourceKind: entry.kind,
        sourceUrl: entry.url,
      });
    }
  }

  return { observations, skippedSources };
}

export function toLiteObservations(
  observations: FetchedObservation[],
): MarketRadarObservation[] {
  return observations.map(({ sourceId: _sourceId, sourceKind: _sourceKind, sourceUrl: _sourceUrl, ...observation }) => observation);
}
