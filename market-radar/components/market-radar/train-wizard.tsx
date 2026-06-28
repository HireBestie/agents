"use client";

import { useState } from "react";
import {
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  Wand2Icon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WIZARD_STEPS } from "@/lib/constants";
import {
  buildConfigPayload,
  linesToList,
  listToLines,
  type MonitorFormState,
  type SourceEntry,
} from "@/lib/monitor-form";

const MANAGED_CHANNELS = [
  { name: "Slack", status: "Available in managed" },
  { name: "Telegram", status: "Coming soon" },
  { name: "WhatsApp", status: "Request support" },
];

type TrainWizardProps = {
  form: MonitorFormState;
  onChange: (form: MonitorFormState) => void;
  onComplete: () => void;
  onRunComplete: () => void;
};

export function TrainWizard({
  form,
  onChange,
  onComplete,
  onRunComplete,
}: TrainWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [newSource, setNewSource] = useState<{
    kind: SourceEntry["kind"];
    url: string;
  }>({ kind: "rss", url: "" });
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestKind, setRequestKind] = useState("");
  const [requestDetail, setRequestDetail] = useState("");

  const progress = (step / WIZARD_STEPS.length) * 100;
  const current = WIZARD_STEPS[step - 1];

  function patch(partial: Partial<MonitorFormState>) {
    onChange({ ...form, ...partial });
  }

  async function saveConfig(): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const payload = buildConfigPayload(form);
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        setError(data.error);
        return false;
      }
      return true;
    } catch {
      setError("Could not save — check your connection.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    if (step === 1 && !form.operatorSummary.trim()) {
      setError("Tell Bestie what business to watch.");
      return;
    }
    if (step === 2 && form.assumptions.filter(Boolean).length === 0) {
      setError("Add at least one assumption.");
      return;
    }
    if (step === 3 && form.principles.filter(Boolean).length === 0) {
      setError("Add at least one principle.");
      return;
    }
    if (step === 4 && form.sources.length === 0) {
      setError("Add at least one source.");
      return;
    }

    const ok = await saveConfig();
    if (!ok) return;

    if (step < WIZARD_STEPS.length) {
      setStep(step + 1);
      setMessage(null);
      setError(null);
    }
  }

  async function handleSuggestSources() {
    setSuggesting(true);
    setError(null);
    try {
      const response = await fetch("/api/sources/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorSummary: form.operatorSummary,
          assumptions: form.assumptions,
          principles: form.principles,
        }),
      });
      const data = (await response.json()) as {
        executableSources?: SourceEntry[];
        backlogRequests?: Array<{ kind: string; detail: string }>;
        error?: string;
      };
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.executableSources?.length) {
        patch({ sources: data.executableSources });
        const backlog = data.backlogRequests?.length ?? 0;
        setMessage(
          `Suggested ${data.executableSources.length} sources${backlog ? ` · ${backlog} queued for support` : ""}.`,
        );
      }
    } catch {
      setError("Could not suggest sources right now.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleRunScan() {
    setRunning(true);
    setError(null);
    setMessage(null);
    const saved = await saveConfig();
    if (!saved) {
      setRunning(false);
      return;
    }

    try {
      const payload = buildConfigPayload(form);
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorSummary: payload.operatorSummary,
          assumptions: payload.assumptions,
          principles: payload.principles,
          sourceRegistry: payload.sources,
          sinceHours: 48,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        digest?: unknown;
        deliveries?: Array<{ channel: string; ok: boolean }>;
      };
      if (data.error) {
        setError(data.error);
        return;
      }
      const emailed = data.deliveries?.find((d) => d.channel === "email")?.ok;
      setMessage(
        emailed ?
          "Scan complete — digest sent to your inbox."
        : "Scan complete — open Digest to review.",
      );
      onComplete();
      onRunComplete();
    } catch {
      setError("Scan failed — try again in a moment.");
    } finally {
      setRunning(false);
    }
  }

  function addSource() {
    if (!newSource.url.trim()) return;
    let label = newSource.url;
    try {
      label = new URL(newSource.url).hostname;
    } catch {
      /* keep raw */
    }
    patch({
      sources: [
        ...form.sources,
        {
          id: `source-${Date.now()}`,
          kind: newSource.kind,
          url: newSource.url.trim(),
          label,
          status: "active",
        },
      ],
    });
    setNewSource({ kind: "rss", url: "" });
    setAddSourceOpen(false);
  }

  async function submitSourceRequest() {
    if (!requestKind.trim() || !requestDetail.trim()) return;
    try {
      const response = await fetch("/api/sources/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedKind: requestKind.trim(),
          requestedDetail: requestDetail.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        setError(data.error);
        return;
      }
      setMessage("Request logged — we'll prioritize adapter support.");
      setRequestOpen(false);
      setRequestKind("");
      setRequestDetail("");
    } catch {
      setError("Could not submit request.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-arena">
          Train Bestie · Step {step} of {WIZARD_STEPS.length}
        </p>
        <h2 className="font-display text-3xl font-semibold">{current.prompt}</h2>
        {step === 2 ? (
          <p className="text-muted-foreground font-body-serif">
            Write beliefs that would change a decision if they moved.
          </p>
        ) : null}
        {step === 3 ? (
          <p className="text-muted-foreground font-body-serif">
            Principles are decision rules, not values posters.
          </p>
        ) : null}
      </header>

      <Progress value={progress} />

      <div className="card-editorial p-6">
        {step === 1 ? (
          <div className="space-y-2">
            <Label htmlFor="business">Business context</Label>
            <Textarea
              id="business"
              className="min-h-32"
              value={form.operatorSummary}
              onChange={(e) => patch({ operatorSummary: e.target.value })}
              placeholder="Who you serve, what market you compete in, what decisions Bestie should protect…"
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2">
            <Label htmlFor="assumptions">Assumptions (one per line)</Label>
            <Textarea
              id="assumptions"
              className="min-h-36 font-data text-sm"
              value={listToLines(form.assumptions)}
              onChange={(e) => patch({ assumptions: linesToList(e.target.value) })}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-2">
            <Label htmlFor="principles">Principles (one per line)</Label>
            <Textarea
              id="principles"
              className="min-h-36 font-data text-sm"
              value={listToLines(form.principles)}
              onChange={(e) => patch({ principles: linesToList(e.target.value) })}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {form.sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2"
                >
                  <Badge variant="watching">{source.kind}</Badge>
                  <span className="text-sm">{source.label}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      patch({
                        sources: form.sources.filter((s) => s.id !== source.id),
                      })
                    }
                    aria-label={`Remove ${source.label}`}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={addSourceOpen} onOpenChange={setAddSourceOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PlusIcon className="size-4" />
                    Add source
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a watch source</DialogTitle>
                    <DialogDescription>
                      RSS feed, website homepage, or sitemap URL.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Kind</Label>
                      <Select
                        value={newSource.kind}
                        onValueChange={(v) =>
                          setNewSource({
                            ...newSource,
                            kind: v as SourceEntry["kind"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rss">RSS feed</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="sitemap">Sitemap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input
                        value={newSource.url}
                        onChange={(e) =>
                          setNewSource({ ...newSource, url: e.target.value })
                        }
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={addSource}>Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleSuggestSources}
                disabled={suggesting}
              >
                {suggesting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Wand2Icon className="size-4" />
                )}
                Suggest sources
              </Button>

              <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Request unsupported source
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request a source type</DialogTitle>
                    <DialogDescription>
                      Tender feeds, regulatory portals, search queries — tell us what you need.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Source type</Label>
                      <Input
                        value={requestKind}
                        onChange={(e) => setRequestKind(e.target.value)}
                        placeholder="e.g. regulatory_feed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Details</Label>
                      <Textarea
                        value={requestDetail}
                        onChange={(e) => setRequestDetail(e.target.value)}
                        placeholder="URL or description…"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitSourceRequest}>Submit request</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email digest</Label>
              <Input
                id="email"
                type="email"
                value={form.deliveryEmail}
                onChange={(e) => patch({ deliveryEmail: e.target.value })}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Cadence</Label>
              <Select
                value={form.cadenceFrequency}
                onValueChange={(v) =>
                  patch({
                    cadenceFrequency: v as MonitorFormState["cadenceFrequency"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily morning brief · 07:00 UTC</SelectItem>
                  <SelectItem value="weekly">Weekly · Monday 07:00 UTC</SelectItem>
                  <SelectItem value="manual">Manual — scan on demand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-sm border border-border bg-muted/40 p-4">
              <p className="label-arena">Other channels</p>
              {MANAGED_CHANNELS.map((ch) => (
                <div
                  key={ch.name}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <span>{ch.name}</span>
                  <Badge variant="outline">{ch.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-4 text-center">
            <p className="font-body-serif text-muted-foreground">
              Bestie will scan your sources, rank signals against your assumptions,
              and prepare a digest with recommended actions.
            </p>
            <Button size="lg" onClick={handleRunScan} disabled={running || saving}>
              {running ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  <SparklesIcon className="size-4" />
                  Run first scan
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>

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

      {step < 6 ? (
        <div className="flex justify-between gap-3">
          <Button
            variant="ghost"
            disabled={step === 1 || saving}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          <Button onClick={handleContinue} disabled={saving}>
            {saving ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
