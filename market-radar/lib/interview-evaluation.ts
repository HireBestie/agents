import { z } from "zod";

import {
  InterviewSlotIdSchema,
  InterviewSlotStateSchema,
  MarketRadarInterviewStateSchema,
  computeCanCompile,
  mergeInterviewState,
  pickNextActiveSlot,
  slotQuestionPrompt,
  type InterviewSlotId,
  type InterviewSlotState,
  type MarketRadarInterviewState,
} from "./interview-state";

export const UpdateInterviewStateInputSchema = z.object({
  targetSlot: InterviewSlotIdSchema,
  updatedSlots: z
    .object({
      pain: InterviewSlotStateSchema.optional(),
      escalation: InterviewSlotStateSchema.optional(),
      manualChecks: InterviewSlotStateSchema.optional(),
      sources: InterviewSlotStateSchema.optional(),
      delivery: InterviewSlotStateSchema.optional(),
      actionPolicy: InterviewSlotStateSchema.optional(),
    })
    .optional(),
  activeSlot: InterviewSlotIdSchema,
  nextQuestion: z.string().min(1).max(500),
});

export type UpdateInterviewStateInput = z.infer<
  typeof UpdateInterviewStateInputSchema
>;

export function applyInterviewEvaluation(
  current: MarketRadarInterviewState,
  evaluation: UpdateInterviewStateInput,
  userMessage: string,
): MarketRadarInterviewState {
  const parsedCurrent = MarketRadarInterviewStateSchema.parse(current);
  const parsedEvaluation = UpdateInterviewStateInputSchema.parse(evaluation);

  const patchSlots: Partial<Record<InterviewSlotId, Partial<InterviewSlotState>>> = {
    ...(parsedEvaluation.updatedSlots ?? {}),
  };

  const trimmedMessage = userMessage.trim();
  if (trimmedMessage && !patchSlots[parsedEvaluation.targetSlot]) {
    const existing = parsedCurrent.slots[parsedEvaluation.targetSlot];
    patchSlots[parsedEvaluation.targetSlot] = {
      ...existing,
      answer: existing.answer
        ? `${existing.answer}\n${trimmedMessage}`.slice(0, 4_000)
        : trimmedMessage,
      status: existing.status === "missing" ? "partial" : existing.status,
    };
  }

  const merged = mergeInterviewState(parsedCurrent, {
    slots: patchSlots,
    activeSlot: parsedEvaluation.activeSlot,
    nextQuestion: parsedEvaluation.nextQuestion,
  });

  const activeSlot = pickNextActiveSlot(merged.slots, parsedEvaluation.activeSlot);

  return MarketRadarInterviewStateSchema.parse({
    ...merged,
    activeSlot,
    nextQuestion:
      parsedEvaluation.nextQuestion || slotQuestionPrompt(activeSlot),
    canCompile: computeCanCompile(merged.slots),
  });
}
