"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BestieInterviewChat } from "@/components/market-radar/bestie-interview-chat";
import { CoveragePanel } from "@/components/market-radar/coverage-panel";
import { FtueStepper } from "@/components/market-radar/ftue-stepper";
import {
  canLaunchFirstScan,
  WatchPlanReview,
} from "@/components/market-radar/watch-plan-review";
import { PAIN_INTERVIEW_QUESTIONS } from "@/lib/pain-interview-questions";
import { assessPainCoverage } from "@/lib/pain-coverage";
import type { DeployStatus } from "@/lib/monitor-form";
import {
  BestieSeedV1Schema,
  bestieSeedToRunRequest,
  confirmBestieSeed,
  hasRelevantActiveSources,
  type BestieSeedV1,
  type PainCoverageAssessmentV1,
} from "@/lib/ontology-seed";

type Phase = "interview" | "review" | "run";

type TrainWizardProps = {
  onComplete: () => void;
  onRunComplete: () => void;
  initialSeed?: BestieSeedV1 | null;
  deployStatus?: DeployStatus | null;
};

export function TrainWizard({
  onComplete,
  onRunComplete,
  initialSeed,
  deployStatus = null,
}: TrainWizardProps) {
  const [phase, setPhase] = useState<Phase>(initialSeed ? "review" : "interview");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState<BestieSeedV1 | null>(initialSeed ?? null);
  const [coverage, setCoverage] = useState<PainCoverageAssessmentV1 | null>(
    initialSeed ? assessPainCoverage(initialSeed) : null,
  );
  const [sourceBacklog, setSourceBacklog] = useState<
    Array<{ kind: string; detail: string; rationale?: string }>
  >([]);
  const [needsSourceApproval, setNeedsSourceApproval] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  async function handleCompile() {
    const payload = PAIN_INTERVIEW_QUESTIONS.map((question) => ({
      questionId: question.id,
      answer: answers[question.id]?.trim() ?? "",
    })).filter((answer) => answer.answer);

    if (payload.length === 0) {
      setError("Complete the interview before compiling your watch plan.");
      return;
    }

    setCompiling(true);
    setError(null);
    try {
      const response = await fetch("/api/elicit/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = (await response.json()) as {
        seed?: BestieSeedV1;
        coverage?: PainCoverageAssessmentV1;
        sourceBacklog?: Array<{ kind: string; detail: string; rationale?: string }>;
        needsSourceApproval?: boolean;
        error?: string;
      };
      if (data.error || !data.seed) {
        setError(data.error ?? "Compile failed.");
        return;
      }
      setSeed(data.seed);
      setCoverage(data.coverage ?? assessPainCoverage(data.seed));
      setSourceBacklog(data.sourceBacklog ?? []);
      setNeedsSourceApproval(Boolean(data.needsSourceApproval));
      setPhase("review");
      setMessage("Bestie translated the interview into a watch plan - review and edit.");
    } catch {
      setError("Could not compile - check AI connection.");
    } finally {
      setCompiling(false);
    }
  }

  async function handleSaveAndRun() {
    if (!seed) return;

    if (!canLaunchFirstScan(seed, deployStatus)) {
      if (!hasRelevantActiveSources(seed)) {
        setError(
          "Add at least one relevant watch source before running. Generic probe feeds are not auto-added.",
        );
        return;
      }
      setError(
        "Connect AI, memory, and schedule on Welcome before your first scan.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const confirmed = confirmBestieSeed(BestieSeedV1Schema.parse(seed));
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bestieSeed: confirmed, confirm: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        bestieSeed?: BestieSeedV1;
      };
      if (data.error) {
        setError(data.error);
        return;
      }

      const savedSeed = data.bestieSeed ?? confirmed;
      setSeed(savedSeed);
      onComplete();
      setPhase("run");
      setRunning(true);

      const runResponse = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bestieSeedToRunRequest(savedSeed)),
      });
      const runData = (await runResponse.json()) as {
        error?: string;
        deliveries?: Array<{ channel: string; ok: boolean }>;
      };
      if (runData.error) {
        setError(runData.error);
        return;
      }

      const emailed = runData.deliveries?.find((delivery) => delivery.channel === "email")?.ok;
      setMessage(
        emailed
          ? "Scan complete. Digest sent to your inbox."
          : "Scan complete. Open Digest to review your web digest.",
      );
      onRunComplete();
    } catch {
      setError("Save or scan failed.");
    } finally {
      setSaving(false);
      setRunning(false);
    }
  }

  async function handleCoverageRequest(painId: string, capability: string) {
    setRequesting(`${painId}:${capability}`);
    setError(null);
    try {
      const email = seed?.deliverySeed.destinations.find(
        (destination) => destination.kind === "email",
      )?.target;
      const response = await fetch("/api/coverage/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          painId,
          requestedCapability: capability,
          contactEmail: email,
          context: { phase: "onboarding_review" },
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        status?: "recorded" | "upvoted";
        requestCount?: number;
      };
      if (data.error) {
        setError(data.error);
        return;
      }
      setMessage(
        data.status === "upvoted" ?
          `Request upvoted${data.requestCount ? ` (${data.requestCount} total)` : ""} - this helps us prioritize coverage.`
        : "Request recorded - this helps us prioritize coverage.",
      );
    } catch {
      setError("Could not record request.");
    } finally {
      setRequesting(null);
    }
  }

  function updateAssumption(index: number, statement: string) {
    if (!seed) return;
    const next = structuredClone(seed);
    next.worldModelSeed.assumptions[index] = {
      ...next.worldModelSeed.assumptions[index]!,
      statement,
    };
    setSeed(next);
    setCoverage(assessPainCoverage(next));
  }

  function updatePrinciple(index: number, statement: string) {
    if (!seed) return;
    const next = structuredClone(seed);
    next.worldviewSeed.principles[index] = {
      ...next.worldviewSeed.principles[index]!,
      statement,
    };
    setSeed(next);
    setCoverage(assessPainCoverage(next));
  }

  function updateDigestEmail(value: string) {
    if (!seed) return;
    const next = structuredClone(seed);
    const destination = next.deliverySeed.destinations.find(
      (item) => item.kind === "email",
    );
    if (destination) {
      destination.target = value;
      destination.status = value.trim() ? "active" : "request_support";
    }
    setSeed(next);
    setCoverage(assessPainCoverage(next));
  }

  const launchReady = seed ? canLaunchFirstScan(seed, deployStatus) : false;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="label-arena">Train Bestie</p>
          <h2 className="font-display text-3xl font-semibold">
            {phase === "interview"
              ? "Interview your Market Radar Bestie."
              : phase === "review"
                ? "Approve your watch plan"
                : "Running first scan"}
          </h2>
          <p className="text-muted-foreground font-body-serif">
            {phase === "interview"
              ? "Speak in plain language. Bestie updates slot state through tools after each reply."
              : phase === "review"
                ? "Bestie compiled your brief into a watch plan. Edit anything, then launch."
                : "Bestie is scanning your sources now."}
          </p>
        </div>
        <FtueStepper
          steps={[
            {
              id: "connections",
              title: "Connection readiness",
              status:
                deployStatus?.infraReady ? "complete" : "upcoming",
            },
            {
              id: "interview",
              title: "Interview Bestie",
              status:
                phase === "interview"
                  ? "current"
                  : phase === "review" || phase === "run"
                    ? "complete"
                    : "upcoming",
            },
            {
              id: "approve",
              title: "Approve watch plan",
              status:
                phase === "review"
                  ? "current"
                  : phase === "run"
                    ? "complete"
                    : "upcoming",
            },
            {
              id: "scan",
              title: "First scan",
              status: phase === "run" ? "current" : "upcoming",
            },
            {
              id: "watch",
              title: "Watch room",
              status: "upcoming",
            },
          ]}
        />
      </header>

      {phase === "interview" ? (
        <BestieInterviewChat
          onAnswersChange={setAnswers}
          onCompile={handleCompile}
          compiling={compiling}
        />
      ) : null}

      {phase === "review" && seed && coverage ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <WatchPlanReview
              seed={seed}
              deployStatus={deployStatus}
              sourceBacklog={sourceBacklog}
              needsSourceApproval={needsSourceApproval}
              onAssumptionChange={updateAssumption}
              onPrincipleChange={updatePrinciple}
              onDigestEmailChange={updateDigestEmail}
            />

            <Button
              size="lg"
              onClick={handleSaveAndRun}
              disabled={saving || running || !launchReady}
            >
              {saving || running ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {running ? "Scanning..." : "Saving..."}
                </>
              ) : (
                <>
                  <SparklesIcon className="size-4" />
                  Confirm and run first scan
                </>
              )}
            </Button>
            {!launchReady ? (
              <p className="text-sm text-muted-foreground">
                Complete the launch checklist above before running. You can still
                edit the plan while connections finish wiring.
              </p>
            ) : null}
          </div>

          <CoveragePanel
            coverage={coverage}
            onRequest={handleCoverageRequest}
            requesting={requesting}
          />
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
