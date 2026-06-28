import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

import { assertGatewayAuth, resolveMarketRadarModel } from "@/lib/gateway-model";
import { latestUserTextFromUIMessages } from "@/lib/interview-client";
import {
  MarketRadarInterviewStateSchema,
  createInitialInterviewState,
} from "@/lib/interview-state";
import {
  createInterviewTools,
  interviewStopWhen,
  prepareInterviewStep,
} from "@/lib/interview-tools";

export const dynamic = "force-dynamic";

const ChatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).optional(),
  interviewState: MarketRadarInterviewStateSchema.optional(),
});

export async function POST(request: Request) {
  assertGatewayAuth();

  const body = ChatRequestSchema.parse(await request.json());
  const messages = body.messages ?? [];
  const holder = {
    state: body.interviewState ?? createInitialInterviewState(),
    latestUserMessage: latestUserTextFromUIMessages(messages),
    readyToCompile: false,
  };

  const tools = createInterviewTools(holder);

  const result = streamText({
    model: resolveMarketRadarModel(),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: [...interviewStopWhen],
    prepareStep: async ({ stepNumber }) => prepareInterviewStep(stepNumber, holder),
    onStepFinish: ({ toolCalls }) => {
      if (toolCalls.some((call) => call.toolName === "readyToCompile")) {
        holder.readyToCompile = true;
      }
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          interviewState: holder.state,
          readyToCompile: holder.readyToCompile,
        };
      }
      return undefined;
    },
  });
}
