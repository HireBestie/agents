import { z } from "zod";

import { PAIN_INTERVIEW_QUESTIONS } from "./pain-interview-questions";

export const InterviewSlotIdSchema = z.enum([
  "pain",
  "escalation",
  "manualChecks",
  "sources",
  "delivery",
  "actionPolicy",
]);

export type InterviewSlotId = z.infer<typeof InterviewSlotIdSchema>;

export const InterviewSlotStatusSchema = z.enum([
  "missing",
  "partial",
  "complete",
  "skipped",
]);

export type InterviewSlotStatus = z.infer<typeof InterviewSlotStatusSchema>;

export const InterviewSlotStateSchema = z.object({
  status: InterviewSlotStatusSchema,
  answer: z.string().max(4_000).optional(),
  missing: z.array(z.string().max(200)).max(6).optional(),
});

export type InterviewSlotState = z.infer<typeof InterviewSlotStateSchema>;

export const MarketRadarInterviewStateSchema = z.object({
  schemaVersion: z.literal(1),
  slots: z.object({
    pain: InterviewSlotStateSchema,
    escalation: InterviewSlotStateSchema,
    manualChecks: InterviewSlotStateSchema,
    sources: InterviewSlotStateSchema,
    delivery: InterviewSlotStateSchema,
    actionPolicy: InterviewSlotStateSchema,
  }),
  activeSlot: InterviewSlotIdSchema,
  nextQuestion: z.string().max(500),
  canCompile: z.boolean(),
});

export type MarketRadarInterviewState = z.infer<
  typeof MarketRadarInterviewStateSchema
>;

/** Slots that must be complete (or skipped) before compile unlocks. */
export const REQUIRED_COMPILE_SLOTS: InterviewSlotId[] = [
  "pain",
  "escalation",
  "sources",
  "delivery",
];

export const SLOT_TO_QUESTION_ID: Record<InterviewSlotId, string> = {
  pain: "too_late",
  escalation: "worth_interrupting",
  manualChecks: "manual_checks",
  sources: "watch_targets",
  delivery: "digest_destination",
  actionPolicy: "recommended_action",
};

export const QUESTION_ID_TO_SLOT: Record<string, InterviewSlotId> = Object.fromEntries(
  Object.entries(SLOT_TO_QUESTION_ID).map(([slot, questionId]) => [
    questionId,
    slot,
  ]),
) as Record<string, InterviewSlotId>;

export const SLOT_LABELS: Record<InterviewSlotId, string> = {
  pain: "What you find out too late",
  escalation: "What is worth interrupting you",
  manualChecks: "What you check manually today",
  sources: "Sources and competitors to watch",
  delivery: "Where the digest should land",
  actionPolicy: "What Bestie should recommend when something matters",
};

function emptySlot(): InterviewSlotState {
  return { status: "missing" };
}

export function createInitialInterviewState(): MarketRadarInterviewState {
  const first = PAIN_INTERVIEW_QUESTIONS[0]!;
  return MarketRadarInterviewStateSchema.parse({
    schemaVersion: 1,
    slots: {
      pain: emptySlot(),
      escalation: emptySlot(),
      manualChecks: emptySlot(),
      sources: emptySlot(),
      delivery: emptySlot(),
      actionPolicy: emptySlot(),
    },
    activeSlot: "pain",
    nextQuestion: first.prompt,
    canCompile: false,
  });
}

export function slotQuestionPrompt(slotId: InterviewSlotId): string {
  const questionId = SLOT_TO_QUESTION_ID[slotId];
  const question = PAIN_INTERVIEW_QUESTIONS.find((item) => item.id === questionId);
  return question?.prompt ?? SLOT_LABELS[slotId];
}

export function slotIsReady(slot: InterviewSlotState): boolean {
  return slot.status === "complete" || slot.status === "skipped";
}

export function computeCanCompile(
  slots: MarketRadarInterviewState["slots"],
): boolean {
  return REQUIRED_COMPILE_SLOTS.every((slotId) => slotIsReady(slots[slotId]));
}

export function countReadySlots(
  slots: MarketRadarInterviewState["slots"],
): number {
  return InterviewSlotIdSchema.options.filter((slotId) =>
    slotIsReady(slots[slotId as InterviewSlotId]),
  ).length;
}

export function interviewProgress(
  state: MarketRadarInterviewState,
): { ready: number; total: number; percent: number } {
  const total = InterviewSlotIdSchema.options.length;
  const ready = countReadySlots(state.slots);
  return {
    ready,
    total,
    percent: (ready / total) * 100,
  };
}

export function interviewStateToAnswers(
  state: MarketRadarInterviewState,
): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const slotId of InterviewSlotIdSchema.options) {
    const id = slotId as InterviewSlotId;
    const answer = state.slots[id].answer?.trim();
    if (!answer) continue;
    answers[SLOT_TO_QUESTION_ID[id]] = answer;
  }
  return answers;
}

export function pickNextActiveSlot(
  slots: MarketRadarInterviewState["slots"],
  preferred?: InterviewSlotId,
): InterviewSlotId {
  if (preferred && !slotIsReady(slots[preferred])) {
    return preferred;
  }

  for (const slotId of InterviewSlotIdSchema.options) {
    const id = slotId as InterviewSlotId;
    if (!slotIsReady(slots[id])) return id;
  }

  return "actionPolicy";
}

export type InterviewStatePatch = {
  activeSlot?: InterviewSlotId;
  nextQuestion?: string;
  canCompile?: boolean;
  slots?: Partial<Record<InterviewSlotId, Partial<InterviewSlotState>>>;
};

export function mergeInterviewState(
  current: MarketRadarInterviewState,
  patch: InterviewStatePatch,
): MarketRadarInterviewState {
  const mergedSlots = { ...current.slots };
  if (patch.slots) {
    for (const slotId of InterviewSlotIdSchema.options) {
      const id = slotId as InterviewSlotId;
      const slotPatch = patch.slots[id];
      if (slotPatch) {
        mergedSlots[id] = {
          ...mergedSlots[id],
          ...slotPatch,
        };
      }
    }
  }

  const activeSlot =
    patch.activeSlot ?? pickNextActiveSlot(mergedSlots, current.activeSlot);
  const canCompile = computeCanCompile(mergedSlots);

  return MarketRadarInterviewStateSchema.parse({
    schemaVersion: 1,
    slots: mergedSlots,
    activeSlot,
    nextQuestion:
      patch.nextQuestion ??
      (mergedSlots[activeSlot].status === "partial" &&
      mergedSlots[activeSlot].missing?.length
        ? mergedSlots[activeSlot].missing![0]!
        : slotQuestionPrompt(activeSlot)),
    canCompile,
  });
}

export function formatInterviewStateForPrompt(
  state: MarketRadarInterviewState,
): string {
  const lines = InterviewSlotIdSchema.options.map((slotId) => {
    const id = slotId as InterviewSlotId;
    const slot = state.slots[id];
    const missing =
      slot.missing?.length ? ` missing=[${slot.missing.join("; ")}]` : "";
    const answer = slot.answer ? ` answer="${slot.answer.slice(0, 240)}"` : "";
    return `- ${id} (${SLOT_LABELS[id]}): status=${slot.status}${answer}${missing}`;
  });

  return [
    "Interview slot state:",
    ...lines,
    `Active slot: ${state.activeSlot}`,
    `Next question focus: ${state.nextQuestion}`,
    `Can compile: ${state.canCompile}`,
  ].join("\n");
}
