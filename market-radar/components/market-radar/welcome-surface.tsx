import {
  CheckCircle2Icon,
  CircleIcon,
  ExternalLinkIcon,
  SparklesIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FtueStepper } from "@/components/market-radar/ftue-stepper";
import { MANAGED_URL } from "@/lib/constants";
import type { ConnectionCheck, DeployStatus } from "@/lib/monitor-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ConnectionRow({ check }: { check: ConnectionCheck }) {
  const optional = check.required === false;

  return (
    <div className="flex items-start justify-between gap-3 rounded-sm border border-border bg-background/60 px-4 py-3">
      <div className="flex items-start gap-3">
        {check.connected ? (
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-arena-yes" />
        ) : (
          <CircleIcon
            className={`mt-0.5 size-4 shrink-0 ${
              optional ? "text-muted-foreground/70" : "text-muted-foreground"
            }`}
          />
        )}
        <div>
          <p className="text-sm font-medium">
            {check.label}
            {optional ? (
              <span className="ml-2 font-data text-[10px] uppercase tracking-wider text-muted-foreground">
                optional
              </span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">{check.detail}</p>
          {check.automatic ? (
            <p className="mt-1 font-data text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Automatic on Vercel
            </p>
          ) : null}
        </div>
      </div>
      {!check.connected && check.connectUrl ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" asChild>
                <a href={check.connectUrl} target="_blank" rel="noopener noreferrer">
                  Connect
                  <ExternalLinkIcon className="size-3" />
                </a>
              </Button>
            </TooltipTrigger>
            {check.hint ? (
              <TooltipContent>{check.hint} integration</TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}

export function WelcomeSurface({
  status,
  onStartTraining,
}: {
  status: DeployStatus | null;
  onStartTraining: () => void;
}) {
  const canBrief = status?.canBrief ?? false;
  const infraReady = status?.infraReady ?? false;
  const trained = status?.trainingComplete ?? false;
  const requiredChecks =
    status?.checks.filter((check) => check.required !== false) ?? [];
  const optionalChecks =
    status?.checks.filter((check) => check.required === false) ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="label-arena">Market Radar Bestie</p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Your Market Radar Bestie is live.
          <span className="block text-primary">Now brief it.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground font-body-serif">
          Connect the essentials below, then interview Bestie until your watch plan
          is specific enough to compile. Email can wait — web digest works first.
        </p>
      </header>

      <FtueStepper
        steps={[
          {
            id: "connections",
            title: "Connection readiness",
            status: infraReady ? "complete" : "current",
          },
          {
            id: "interview",
            title: "Interview Bestie",
            status: trained ? "complete" : infraReady ? "current" : "upcoming",
          },
          {
            id: "approve",
            title: "Approve watch plan",
            status: trained ? "current" : "upcoming",
          },
          {
            id: "scan",
            title: "First scan",
            status: "upcoming",
          },
          {
            id: "watch",
            title: "Watch room",
            status: "upcoming",
          },
        ]}
      />

      {status && !canBrief ? (
        <Alert>
          <AlertTitle>Connect AI first</AlertTitle>
          <AlertDescription>
            Bestie needs AI Gateway (or an API key) to interview you and compile a
            watch plan.
          </AlertDescription>
        </Alert>
      ) : null}

      {status && canBrief && !infraReady ? (
        <Alert>
          <AlertTitle>Brief Bestie now — finish connections before first scan</AlertTitle>
          <AlertDescription>
            You can interview and compile while memory or schedule are still
            wiring up. Saving and the first scan need AI, memory, and schedule.
            Email is optional.
          </AlertDescription>
        </Alert>
      ) : null}

      {status && infraReady && !trained ? (
        <Alert variant="success">
          <AlertTitle>Ready to brief Bestie</AlertTitle>
          <AlertDescription>
            Core connections are green. Walk through the interview — no docs
            required.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <p className="label-arena">Required connections</p>
        <div className="grid gap-2">
          {requiredChecks.map((check) => (
            <ConnectionRow key={check.id} check={check} />
          ))}
        </div>
      </section>

      {optionalChecks.length > 0 ? (
        <section className="space-y-3">
          <p className="label-arena">Progressive setup</p>
          <div className="grid gap-2">
            {optionalChecks.map((check) => (
              <ConnectionRow key={check.id} check={check} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={onStartTraining} disabled={!canBrief}>
          <SparklesIcon className="size-4" />
          {trained ? "Update Bestie's brief" : "Brief Bestie"}
        </Button>
        {!canBrief ? (
          <p className="text-sm text-muted-foreground">
            Connect AI to start the interview.
          </p>
        ) : !infraReady ? (
          <p className="text-sm text-muted-foreground">
            Interview now; connect memory and schedule before your first scan.
          </p>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Want graph memory, channels, and operator support?{" "}
        <a
          href={MANAGED_URL}
          className="text-primary underline underline-offset-2"
        >
          Upgrade to managed Bestie
        </a>
        . You can import your self-host seed so you do not start over.
      </p>
    </div>
  );
}
