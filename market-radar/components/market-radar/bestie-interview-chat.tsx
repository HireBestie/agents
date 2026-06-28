"use client";

import {
  FormEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
} from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  Loader2Icon,
  SendIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { extractInterviewUpdateFromMessage } from "@/lib/interview-client";
import {
  InterviewSlotIdSchema,
  SLOT_LABELS,
  createInitialInterviewState,
  interviewProgress,
  interviewStateToAnswers,
  type InterviewSlotId,
  type InterviewSlotStatus,
  type MarketRadarInterviewState,
} from "@/lib/interview-state";

type BestieInterviewChatProps = {
  onAnswersChange: (answers: Record<string, string>) => void;
  onCompile: () => void;
  compiling: boolean;
};

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function applyInterviewUpdate(
  update: ReturnType<typeof extractInterviewUpdateFromMessage>,
  interviewStateRef: MutableRefObject<MarketRadarInterviewState>,
  setInterviewState: (state: MarketRadarInterviewState) => void,
  setReadyToCompile: (ready: boolean) => void,
  onAnswersChange: (answers: Record<string, string>) => void,
) {
  if (update.state) {
    interviewStateRef.current = update.state;
    setInterviewState(update.state);
    onAnswersChange(interviewStateToAnswers(update.state));
  }
  if (update.readyToCompile) {
    setReadyToCompile(true);
  }
}

function completionLabel(
  state: MarketRadarInterviewState,
  readyToCompile: boolean,
): string {
  if (readyToCompile && state.canCompile) {
    return "Bestie declared this interview ready to compile.";
  }
  if (state.canCompile) {
    return "Required slots are complete — Bestie will unlock compile when it calls readyToCompile.";
  }
  const partial = InterviewSlotIdSchema.options.filter((slotId) => {
    const id = slotId as InterviewSlotId;
    return state.slots[id].status === "partial";
  }).length;
  if (partial > 0) {
    return "Bestie is clarifying partial answers before moving on.";
  }
  return "Answer naturally — Bestie updates slot state through tools after each reply.";
}

function slotBadgeVariant(
  status: InterviewSlotStatus,
): "success" | "primary" | "outline" | "watching" {
  switch (status) {
    case "complete":
    case "skipped":
      return "success";
    case "partial":
      return "watching";
    default:
      return "outline";
  }
}

function SlotStatusIcon({ status }: { status: InterviewSlotStatus }) {
  if (status === "complete" || status === "skipped") {
    return <CheckCircle2Icon className="size-3 shrink-0 text-arena-yes" />;
  }
  if (status === "partial") {
    return <AlertCircleIcon className="size-3 shrink-0 text-arena-watch" />;
  }
  return <CircleDashedIcon className="size-3 shrink-0 text-muted-foreground" />;
}

export function BestieInterviewChat({
  onAnswersChange,
  onCompile,
  compiling,
}: BestieInterviewChatProps) {
  const [input, setInput] = useState("");
  const [readyToCompile, setReadyToCompile] = useState(false);
  const [interviewState, setInterviewState] = useState(createInitialInterviewState);
  const interviewStateRef = useRef(interviewState);
  interviewStateRef.current = interviewState;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ interviewState: interviewStateRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: ({ message }) => {
      applyInterviewUpdate(
        extractInterviewUpdateFromMessage(message),
        interviewStateRef,
        setInterviewState,
        setReadyToCompile,
        onAnswersChange,
      );
    },
  });

  const progress = interviewProgress(interviewState);
  const canCompile =
    readyToCompile && interviewState.canCompile && !compiling;
  const streaming = status === "submitted" || status === "streaming";

  const visibleMessages = useMemo<UIMessage[]>(() => {
    if (messages.length > 0) return messages;
    return [
      {
        id: "bestie-opening",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "I am your Market Radar Bestie. Tell me what you usually find out too late — I will interview you until each slot is specific enough to compile a watch plan.",
          },
        ],
      } satisfies UIMessage,
    ];
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="card-editorial overflow-hidden">
        <div className="border-b border-border bg-pitch-claim-bg/60 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-arena">Bestie interview</p>
              <h3 className="font-display text-2xl font-semibold">
                Let me learn what should never surprise you again.
              </h3>
            </div>
            <Badge variant={canCompile ? "success" : "primary"}>
              {progress.ready}/{progress.total} slots ready
            </Badge>
          </div>
          <div className="mt-4 space-y-2">
            <Progress value={progress.percent} />
            <p className="text-xs text-muted-foreground">
              {completionLabel(interviewState, readyToCompile)}
            </p>
          </div>
        </div>

        <div className="max-h-[34rem] space-y-4 overflow-y-auto px-5 py-5">
          {visibleMessages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}
              >
                {!isUser ? (
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    B
                  </div>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm border border-border bg-background"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{messageText(message)}</p>
                </div>
                {isUser ? (
                  <div className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-xs font-semibold">
                    You
                  </div>
                ) : null}
              </div>
            );
          })}

          {streaming ? (
            <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Bestie is evaluating and responding...
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-4">
          <div className="space-y-3">
            <Textarea
              value={input}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setInput(event.target.value)
              }
              placeholder="Reply naturally. Bestie assigns your answer to the right slot and asks follow-ups when needed."
              className="min-h-24"
              disabled={streaming}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!input.trim() || streaming}>
                Send
                <SendIcon className="size-4" />
              </Button>
              {canCompile ? (
                <Button type="button" variant="outline" onClick={onCompile}>
                  Compile watch plan
                  <ArrowRightIcon className="size-4" />
                </Button>
              ) : null}
            </div>
            {error ? (
              <p className="text-sm text-destructive">
                Bestie could not continue the interview stream. Your slot state was saved.
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <aside className="space-y-3">
        <div className="card-editorial p-4">
          <p className="label-arena mb-3">Interview state</p>
          <div className="space-y-3">
            {InterviewSlotIdSchema.options.map((slotId) => {
              const id = slotId as InterviewSlotId;
              const slot = interviewState.slots[id];
              const active = interviewState.activeSlot === id;
              return (
                <div
                  key={id}
                  className={`rounded-sm border px-3 py-2 text-left text-xs ${
                    active ? "border-primary bg-primary/10" : "border-border bg-background/60"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="font-medium">{SLOT_LABELS[id]}</span>
                      <Badge
                        variant={slotBadgeVariant(slot.status)}
                        className="ml-2 align-middle text-[10px]"
                      >
                        {slot.status}
                      </Badge>
                    </span>
                    <SlotStatusIcon status={slot.status} />
                  </span>
                  {slot.answer ? (
                    <p className="mt-1 text-muted-foreground line-clamp-2">{slot.answer}</p>
                  ) : null}
                  {slot.missing?.length ? (
                    <p className="mt-1 text-[11px] text-arena-watch">
                      Needs: {slot.missing.join(" · ")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-sm border border-pitch-claim-border bg-pitch-claim-bg px-4 py-3 text-sm">
          <p className="font-display font-semibold text-pitch-claim">
            Tool-driven interview
          </p>
          <p className="mt-1 text-muted-foreground">
            Each reply runs through AI SDK tools inside /api/chat. Bestie updates slot
            state with updateInterviewState and may call readyToCompile when the watch
            plan is ready — compile unlocks only after readyToCompile, not from prose.
          </p>
        </div>
      </aside>
    </div>
  );
}
