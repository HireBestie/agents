"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BestieInterviewChat } from "@/components/market-radar/bestie-interview-chat";
import { CoveragePanel } from "@/components/market-radar/coverage-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAIN_INTERVIEW_QUESTIONS } from "@/lib/pain-interview-questions";
import { assessPainCoverage } from "@/lib/pain-coverage";
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
};

export function TrainWizard({
  onComplete,
  onRunComplete,
  initialSeed,
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

    if (!hasRelevantActiveSources(seed)) {
      setError(
        "Add at least one relevant watch source before running. Generic probe feeds are not auto-added.",
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
        emailed ? "Scan complete - digest sent." : "Scan complete - open Digest to review.",
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-arena">Train Bestie</p>
        <h2 className="font-display text-3xl font-semibold">
          {phase === "interview"
            ? "Interview your Market Radar Bestie."
            : phase === "review"
              ? "Review your compiled watch"
              : "Running first scan"}
        </h2>
        <p className="text-muted-foreground font-body-serif">
          You speak in plain language. Bestie compiles assumptions, principles,
          sources, monitors, and coverage.
        </p>
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
            <section className="card-editorial p-5 space-y-4">
              <p className="label-arena">Proposed assumptions</p>
              {seed.worldModelSeed.assumptions.map((assumption, index) => (
                <div key={assumption.id}>
                  <Textarea
                    value={assumption.statement}
                    onChange={(event) => updateAssumption(index, event.target.value)}
                    className="font-data text-sm"
                  />
                  {assumption.rationale ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assumption.rationale}
                    </p>
                  ) : null}
                </div>
              ))}
            </section>

            <section className="card-editorial p-5 space-y-4">
              <p className="label-arena">Proposed principles</p>
              {seed.worldviewSeed.principles.map((principle, index) => (
                <div key={principle.id}>
                  <Textarea
                    value={principle.statement}
                    onChange={(event) => updatePrinciple(index, event.target.value)}
                    className="font-data text-sm"
                  />
                </div>
              ))}
            </section>

            <section className="card-editorial p-5 space-y-3">
              <p className="label-arena">Sources</p>
              {seed.sourceSeed.sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active sources yet - add competitor or industry URLs before confirming.
                </p>
              ) : null}
              {seed.sourceSeed.sources.map((source) => (
                <div
                  key={source.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <Badge variant="watching">{source.kind}</Badge>
                  <span>{source.label}</span>
                  <span className="truncate font-data text-xs text-muted-foreground">
                    {source.url}
                  </span>
                </div>
              ))}
              {sourceBacklog.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Suggested sources to approve
                  </p>
                  {sourceBacklog.map((item) => (
                    <p key={`${item.kind}:${item.detail}`} className="text-xs">
                      <Badge variant="outline" className="mr-2">
                        {item.kind}
                      </Badge>
                      {item.detail}
                    </p>
                  ))}
                </div>
              ) : null}
              {needsSourceApproval ? (
                <Alert>
                  <AlertDescription>
                    Coverage stays partial until you add relevant watch sources.
                    Bestie will not auto-add generic news feeds.
                  </AlertDescription>
                </Alert>
              ) : null}
            </section>

            <section className="card-editorial space-y-2 p-5">
              <Label htmlFor="email">Digest email</Label>
              <Input
                id="email"
                type="email"
                value={
                  seed.deliverySeed.destinations.find((item) => item.kind === "email")
                    ?.target ?? ""
                }
                onChange={(event) => updateDigestEmail(event.target.value)}
              />
            </section>

            <Button
              size="lg"
              onClick={handleSaveAndRun}
              disabled={saving || running || !hasRelevantActiveSources(seed)}
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
