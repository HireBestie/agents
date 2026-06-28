import { generateObject } from "ai";
import { z } from "zod";

import { assertGatewayAuth, resolveMarketRadarModel } from "./gateway-model";
import {
  AudiencePainIdSchema,
  BestieSeedV1Schema,
  type AudiencePainId,
  type BestieSeedV1,
  type PainCoverageAssessmentV1,
  newDraftSeedId,
} from "./ontology-seed";
import { assessPainCoverage } from "./pain-coverage";
import { isDatabaseConfigured } from "./db/client";
import { EXECUTABLE_SOURCE_KINDS } from "./monitor-config";
import { PAIN_INTERVIEW_QUESTIONS } from "./pain-interview-questions";

const ExecutableKindSchema = z.enum(EXECUTABLE_SOURCE_KINDS);

/*
const LEGACY_PAIN_INTERVIEW_QUESTIONS_FOR_REMOVAL = [
  {
    id: "too_late",
    prompt: "What do you usually find out too late?",
    hint: "Competitor moves, RFP windows, pricing shifts, regulations…",
    defaultPainIds: ["found_out_too_late", "competitor_move_missed"] as const,
  },
  {
    id: "worth_interrupting",
    prompt: "What would make this worth interrupting you?",
    hint: "What severity or type of signal deserves an escalation?",
    defaultPainIds: ["noise_without_signal", "cant_translate_to_action"] as const,
  },
  {
    id: "manual_checks",
    prompt: "What do you currently check manually?",
    hint: "Sites, feeds, newsletters, competitor pages…",
    defaultPainIds: ["nobodys_job", "found_out_too_late"] as const,
  },
  {
    id: "watch_targets",
    prompt: "What sources or competitors should Bestie watch?",
    hint: "Names, URLs, or source types if you know them.",
    defaultPainIds: ["competitor_move_missed", "found_out_too_late"] as const,
  },
  {
    id: "digest_destination",
    prompt: "Where should the digest land?",
    hint: "Email address for now; other channels available in managed Bestie.",
    defaultPainIds: ["nobodys_job"] as const,
  },
  {
    id: "recommended_action",
    prompt: "What should Bestie recommend when something matters?",
    hint: "Call a customer, adjust pricing, respond to RFP, brief sales…",
    defaultPainIds: ["cant_translate_to_action", "saw_but_froze"] as const,
  },
] as const;
*/

const AnswerPainMappingSchema = z.object({
  questionId: z.string().min(1),
  mappedPainIds: z.array(AudiencePainIdSchema).max(4),
});

const CompileOutputSchema = z.object({
  elicitationSummary: z.string().max(4_000),
  answerPainMappings: z.array(AnswerPainMappingSchema).max(6),
  assumptions: z.array(
    z.object({
      statement: z.string().min(1).max(500),
      rationale: z.string().max(500).optional(),
      originPainIds: z.array(AudiencePainIdSchema).default([]),
    }),
  ).min(1).max(10),
  principles: z.array(
    z.object({
      statement: z.string().min(1).max(500),
      rationale: z.string().max(500).optional(),
      originPainIds: z.array(AudiencePainIdSchema).default([]),
    }),
  ).min(1).max(10),
  sources: z.array(
    z.object({
      kind: ExecutableKindSchema,
      url: z.string().url(),
      label: z.string().min(1),
      rationale: z.string().max(300).optional(),
    }),
  ).max(8),
  sourceBacklog: z.array(
    z.object({
      kind: z.string().min(1),
      detail: z.string().min(1),
      rationale: z.string().max(300).optional(),
    }),
  ).max(5),
  cadence: z.enum(["manual", "daily", "weekly"]).default("daily"),
  escalationPolicy: z
    .enum(["threat_and_opportunity", "threat_only", "all_keepers"])
    .default("threat_and_opportunity"),
  deliveryEmail: z.string().email().optional(),
});

export type ElicitCompileInput = {
  answers: Array<{ questionId: string; answer: string }>;
};

export type ElicitCompileResult = {
  seed: BestieSeedV1;
  coverage: PainCoverageAssessmentV1;
  sourceBacklog: Array<{ kind: string; detail: string; rationale?: string }>;
  needsSourceApproval: boolean;
};

function resolveAnswerPainIds(
  questionId: string,
  mappings: z.infer<typeof AnswerPainMappingSchema>[],
): AudiencePainId[] {
  const fromModel = mappings.find((m) => m.questionId === questionId)?.mappedPainIds;
  if (fromModel && fromModel.length > 0) return fromModel;

  const question = PAIN_INTERVIEW_QUESTIONS.find((q) => q.id === questionId);
  return question ? [...question.defaultPainIds] : [];
}

export async function compileElicitationToSeed(
  input: ElicitCompileInput,
): Promise<ElicitCompileResult> {
  assertGatewayAuth();
  const modelId = resolveMarketRadarModel();

  const answerBlock = input.answers
    .map((a) => {
      const q = PAIN_INTERVIEW_QUESTIONS.find((item) => item.id === a.questionId);
      return `Q (${a.questionId}): ${q?.prompt ?? a.questionId}\nA: ${a.answer}`;
    })
    .join("\n\n");

  const { object } = await generateObject({
    model: modelId,
    schema: CompileOutputSchema,
    prompt: `You compile operator pain-language into a Market Radar Bestie ontology seed.

Pain interview answers:
${answerBlock}

Rules:
- Translate pain into falsifiable assumptions and decision-rule principles.
- For answerPainMappings: assign per-question mappedPainIds (not one global list).
  Question IDs: too_late, worth_interrupting, manual_checks, watch_targets, digest_destination, recommended_action.
- Map each assumption/principle to precise originPainIds from: found_out_too_late, nobodys_job, cant_translate_to_action, saw_but_froze, rfp_rfq_deadline, competitor_move_missed, noise_without_signal.
- Only include rss, website, or sitemap sources with real public URLs you are confident exist.
- Do NOT invent competitor URLs. If unsure, put the need in sourceBacklog instead.
- It is OK to return zero sources — never add generic news feeds as placeholders.
- Extract delivery email from digest_destination answer when present.
- cadence should usually be daily for "find out too late" pain.
- Principles are decision rules, not values posters.`,
  });

  const assumptions = object.assumptions.map((a) => ({
    id: newDraftSeedId("assumption"),
    statement: a.statement,
    rationale: a.rationale,
    originPainIds: a.originPainIds,
  }));

  const principles = object.principles.map((p) => ({
    id: newDraftSeedId("principle"),
    statement: p.statement,
    rationale: p.rationale,
    originPainIds: p.originPainIds,
  }));

  const sources = object.sources.map((s) => ({
    id: newDraftSeedId("source"),
    kind: s.kind,
    url: s.url,
    label: s.label,
    status: "active" as const,
  }));

  const assumptionId = assumptions[0]!.id;

  const mappedFromAnswers = input.answers.map((a) => ({
    questionId: a.questionId,
    answer: a.answer,
    mappedPainIds: resolveAnswerPainIds(a.questionId, object.answerPainMappings),
  }));

  const sourceBacklog = [...object.sourceBacklog];
  const needsSourceApproval = sources.length === 0;

  if (needsSourceApproval) {
    sourceBacklog.unshift({
      kind: "user_approval",
      detail: "No active watch sources compiled yet — add URLs or approve backlog items before running.",
      rationale: "Self-host Bestie does not auto-add generic probe feeds.",
    });
  }

  const seed = BestieSeedV1Schema.parse({
    schemaVersion: 1,
    preset: "market_radar",
    seedRevision: 1,
    elicitationContext: {
      summary: object.elicitationSummary,
      answers: mappedFromAnswers,
    },
    worldModelSeed: { assumptions },
    worldviewSeed: { principles },
    sourceSeed: { sources },
    monitorSeed: {
      monitors: [
        {
          id: newDraftSeedId("monitor"),
          assumptionId,
          sourceIds: sources.map((s) => s.id),
          cadence: object.cadence,
          escalationPolicy: object.escalationPolicy,
        },
      ],
    },
    deliverySeed: {
      destinations: [
        {
          kind: "email",
          status: object.deliveryEmail ? "active" : "request_support",
          target: object.deliveryEmail,
        },
        { kind: "slack", status: "managed_only" },
        { kind: "telegram", status: "managed_only" },
        { kind: "whatsapp", status: "managed_only" },
      ],
    },
  });

  const coverage = assessPainCoverage(seed, {
    hasDatabase: isDatabaseConfigured(),
  });

  return {
    seed,
    coverage,
    sourceBacklog,
    needsSourceApproval,
  };
}
