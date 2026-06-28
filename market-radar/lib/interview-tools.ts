import {
  hasToolCall,
  isStepCount,
  tool,
  type StopCondition,
  type ToolSet,
} from "ai";
import { z } from "zod";

import {
  UpdateInterviewStateInputSchema,
  applyInterviewEvaluation,
} from "./interview-evaluation";
import {
  REQUIRED_COMPILE_SLOTS,
  SLOT_LABELS,
  formatInterviewStateForPrompt,
  type MarketRadarInterviewState,
} from "./interview-state";

export type InterviewChatMetadata = {
  interviewState: MarketRadarInterviewState;
  readyToCompile?: boolean;
};

export type InterviewSessionHolder = {
  state: MarketRadarInterviewState;
  latestUserMessage: string;
  readyToCompile: boolean;
};

const INTERVIEW_BASE = `You are Market Radar Bestie interviewing an operator before creating a monitoring agent.

Your job is not to fill a form. Your job is to conduct a short, warm, precise hiring interview that elicits a world model and worldview.

Ask one question at a time. Keep each conversational response under 90 words.

Do not pretend sources are connected. Do not invent URLs.
Do not declare the interview complete in plain text — use the readyToCompile tool when slots are rich enough.`;

const EVALUATE_PHASE = `Phase: evaluate the latest operator message.

You MUST call updateInterviewState before responding in natural language.

Evaluation rules:
1. Decide which slot the message primarily addresses (targetSlot). It may be the active slot or a clarification for an earlier partial slot.
2. Merge the message into that slot's answer. Append/reconcile prior partial answers instead of replacing blindly.
3. Set slot status:
   - missing: no usable signal yet
   - partial: directionally useful but missing specifics listed in missing[]
   - complete: specific enough to compile assumptions/sources/monitors
   - skipped: operator explicitly declines or says unknown/not applicable
4. Examples of partial:
   - pain="competitor moves" → partial, missing=["which competitors?", "what kind of move?"]
   - sources="competitors" → partial, missing=["which competitor names or URLs?"]
   - delivery="email" → partial, missing=["what email address?"]
5. Do NOT mark sources complete without names, URLs, or explicit source categories.
6. Do NOT mark delivery complete without an email unless they chose a non-email channel and said so.
7. Pick activeSlot as the best next slot to improve. Prefer finishing partial slots before advancing.
8. nextQuestion must be one concrete follow-up question for activeSlot. If activeSlot is partial, ask the first missing clarification.
9. Populate updatedSlots with every slot whose answer/status changed.`;

const RESPOND_PHASE = `Phase: respond to the operator after state was updated.

Use the updated slot state below. Ask the nextQuestion focus warmly and precisely.
If the active slot is partial, ask for the specific missing detail — do not advance to a new slot yet.
Use the operator's language, but sharpen vague answers.

If canCompile is true, you may call readyToCompile with a short reason when the watch plan is ready to compile.
Never say "ready to compile" in prose without calling readyToCompile.`;

export function createInterviewTools(holder: InterviewSessionHolder) {
  return {
    updateInterviewState: tool({
      description:
        "Evaluate the operator's latest message and update interview slot state. Call once per operator turn before any conversational reply.",
      inputSchema: UpdateInterviewStateInputSchema,
      execute: async (input) => {
        const nextState = applyInterviewEvaluation(
          holder.state,
          input,
          holder.latestUserMessage,
        );
        holder.state = nextState;
        return nextState;
      },
    }),
    readyToCompile: tool({
      description:
        "Signal that required interview slots are rich enough to compile a watch plan. Call only when canCompile is true.",
      inputSchema: z.object({
        reason: z.string().min(1).max(500),
      }),
    }),
  } satisfies ToolSet;
}

export type InterviewTools = ReturnType<typeof createInterviewTools>;

export const interviewTurnComplete: StopCondition<InterviewTools> = ({ steps }) => {
  const hasStateUpdate = steps.some((step) =>
    step.toolCalls.some((call) => call.toolName === "updateInterviewState"),
  );
  if (!hasStateUpdate) return false;

  const last = steps.at(-1);
  return Boolean(last?.text?.trim());
};

export const interviewStopWhen = [
  isStepCount(5),
  hasToolCall("readyToCompile"),
  interviewTurnComplete,
] as const;

export function prepareInterviewStep(
  stepNumber: number,
  holder: InterviewSessionHolder,
) {
  const stateBlock = formatInterviewStateForPrompt(holder.state);
  const requiredSlots = REQUIRED_COMPILE_SLOTS.map(
    (slotId) => `- ${slotId}: ${SLOT_LABELS[slotId]}`,
  ).join("\n");

  if (stepNumber === 0) {
    return {
      system: [
        INTERVIEW_BASE,
        EVALUATE_PHASE,
        `Required slots before compile:\n${requiredSlots}`,
        stateBlock,
        "Evaluate the latest user message in this thread.",
      ].join("\n\n"),
      toolChoice: { type: "tool" as const, toolName: "updateInterviewState" as const },
      activeTools: ["updateInterviewState" as const],
    };
  }

  return {
    system: [INTERVIEW_BASE, RESPOND_PHASE, stateBlock].join("\n\n"),
    toolChoice: "auto" as const,
    activeTools: holder.state.canCompile
      ? (["readyToCompile"] as const)
      : ([] as const),
  };
}
