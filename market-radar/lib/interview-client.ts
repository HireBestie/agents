import type { UIMessage } from "ai";

import type { InterviewChatMetadata } from "./interview-tools";
import {
  MarketRadarInterviewStateSchema,
  type MarketRadarInterviewState,
} from "./interview-state";

export function latestUserTextFromUIMessages(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    return message.parts
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join("");
  }
  return "";
}

export function extractInterviewUpdateFromMessage(message: UIMessage): {
  state?: MarketRadarInterviewState;
  readyToCompile?: boolean;
} {
  const metadata = (message as UIMessage & { metadata?: InterviewChatMetadata })
    .metadata;

  if (metadata?.interviewState) {
    const parsed = MarketRadarInterviewStateSchema.safeParse(
      metadata.interviewState,
    );
    if (parsed.success) {
      return {
        state: parsed.data,
        readyToCompile: metadata.readyToCompile,
      };
    }
  }

  let state: MarketRadarInterviewState | undefined;
  let readyToCompile = false;

  for (const part of message.parts) {
    if (
      part.type === "tool-updateInterviewState" &&
      part.state === "output-available" &&
      part.output
    ) {
      const parsed = MarketRadarInterviewStateSchema.safeParse(part.output);
      if (parsed.success) {
        state = parsed.data;
      }
    }

    if (part.type === "tool-readyToCompile" && part.state !== "input-streaming") {
      readyToCompile = true;
    }
  }

  return { state, readyToCompile: readyToCompile || undefined };
}
