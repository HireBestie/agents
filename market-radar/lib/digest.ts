import type { MarketRadarLiteItem, MarketRadarRunOutcome } from "./lite-schema";

export type MarketRadarDigestOutput = {
  schemaVersion: 1;
  generatedAt: string;
  escalations: MarketRadarLiteItem[];
  morningBrief: MarketRadarLiteItem[];
  droppedCount: number;
  skippedSources?: string[];
  notes?: string;
  digestMarkdown: string;
  worldModel: MarketRadarRunOutcome["worldModel"];
};

export function splitDigest(outcome: MarketRadarRunOutcome): MarketRadarDigestOutput {
  const escalations = outcome.items.filter((item) =>
    ["threat", "opportunity", "mixed"].includes(item.impact.stance),
  );
  const escalationIds = new Set(
    escalations.map(
      (item) => `${item.observation.title}:${item.observation.url ?? ""}`,
    ),
  );
  const morningBrief = outcome.items.filter(
    (item) =>
      !escalationIds.has(
        `${item.observation.title}:${item.observation.url ?? ""}`,
      ),
  );

  return {
    schemaVersion: 1,
    generatedAt: outcome.generatedAt,
    escalations,
    morningBrief,
    droppedCount: outcome.droppedCount,
    skippedSources: outcome.skippedSources,
    notes: outcome.notes,
    digestMarkdown: formatDigestMarkdown(outcome, { escalations, morningBrief }),
    worldModel: outcome.worldModel,
  };
}

export function formatDigestMarkdown(
  outcome: MarketRadarRunOutcome,
  split?: { escalations: MarketRadarLiteItem[]; morningBrief: MarketRadarLiteItem[] },
): string {
  const date = outcome.generatedAt.slice(0, 10);
  const escalations =
    split?.escalations ??
    outcome.items.filter((item) =>
      ["threat", "opportunity", "mixed"].includes(item.impact.stance),
    );
  const morningBrief =
    split?.morningBrief ??
    outcome.items.filter((item) => {
      const id = `${item.observation.title}:${item.observation.url ?? ""}`;
      return !escalations.some(
        (esc) =>
          `${esc.observation.title}:${esc.observation.url ?? ""}` === id,
      );
    });

  const lines: string[] = [`# Market Radar — ${date}`, ""];

  if (escalations.length > 0) {
    lines.push("## Escalations", "");
    for (const item of escalations) {
      lines.push(
        `- [${item.impact.stance.toUpperCase()}] ${item.observation.title}`,
        `  Assumption: ${item.impact.assumption}`,
        `  Principle: ${item.impact.affectedPrinciples.join("; ")}`,
        `  Action: ${item.recommendation.action} — ${item.recommendation.rationale}`,
        `  Source: ${item.observation.url ?? item.observation.source}`,
        "",
      );
    }
  } else {
    lines.push("## Escalations", "", "- None this run.", "");
  }

  lines.push("## Morning brief", "");
  if (morningBrief.length === 0) {
    lines.push("- No additional keepers.", "");
  } else {
    for (const item of morningBrief) {
      lines.push(
        `- ${item.observation.title} (${item.impact.stance}) — ${item.observation.url ?? ""}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Dropped",
    `${outcome.droppedCount} items off-topic / off-assumption / noise.`,
  );
  if (outcome.skippedSources?.length) {
    lines.push("", `Skipped sources: ${outcome.skippedSources.length}`);
  }
  return lines.join("\n");
}
