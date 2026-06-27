import { generateObject } from "ai";
import { z } from "zod";

import { assertGatewayAuth, resolveMarketRadarModel } from "./gateway-model";
import {
  EXECUTABLE_SOURCE_KINDS,
  SourceRegistryEntrySchema,
  isExecutableSourceKind,
} from "./monitor-config";

const ExecutableKindSchema = z.enum(EXECUTABLE_SOURCE_KINDS);

const SuggestSourcesSchema = z.object({
  suggestions: z.array(
    z.object({
      kind: z.enum(["rss", "sitemap", "website", "search_query"]),
      url: z.string().url(),
      label: z.string().min(1),
      rationale: z.string().min(1),
    }),
  ).max(8),
  unsupportedRequests: z.array(
    z.object({
      kind: z.string().min(1),
      detail: z.string().min(1),
      rationale: z.string().min(1),
    }),
  ).max(5),
});

export async function suggestSources(input: {
  operatorSummary: string;
  assumptions: string[];
  principles: string[];
  geography?: string;
  industry?: string;
}) {
  assertGatewayAuth();
  const modelId = resolveMarketRadarModel();

  const { object } = await generateObject({
    model: modelId,
    schema: SuggestSourcesSchema,
    prompt: `Suggest public monitoring sources for a Market Radar Bestie deployment.

Operator summary:
${input.operatorSummary}

Assumptions:
${input.assumptions.map((item) => `- ${item}`).join("\n")}

Principles:
${input.principles.map((item) => `- ${item}`).join("\n")}

Geography: ${input.geography ?? "unspecified"}
Industry: ${input.industry ?? "unspecified"}

Rules:
- Prefer real public RSS, sitemap, or website URLs when you know them.
- Only put rss, sitemap, or website in suggestions.
- Put search_query, paid feeds, social, and login-walled sources in unsupportedRequests.
- Do not invent fake domains.
- Return at most 8 suggestions.`,
  });

  const backlogRequests = [...object.unsupportedRequests];
  const executableCandidates = [];

  for (const [index, item] of object.suggestions.entries()) {
    if (!isExecutableSourceKind(item.kind)) {
      backlogRequests.push({
        kind: item.kind,
        detail: item.url,
        rationale: item.rationale,
      });
      continue;
    }

    executableCandidates.push(
      SourceRegistryEntrySchema.parse({
        id: `suggested-${index + 1}`,
        kind: ExecutableKindSchema.parse(item.kind),
        url: item.url,
        label: item.label,
        status: "active",
      }),
    );
  }

  return {
    executableSources: executableCandidates,
    backlogRequests,
    notes: executableCandidates.map((item, index) => ({
      id: item.id,
      rationale:
        object.suggestions.find(
          (candidate) =>
            candidate.url === item.url && candidate.kind === item.kind,
        )?.rationale ?? "",
    })),
  };
}
