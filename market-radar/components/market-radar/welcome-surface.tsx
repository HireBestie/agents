import { CheckCircle2Icon, CircleIcon, ExternalLinkIcon, SparklesIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEPLOY_YOUR_OWN_URL,
  FREE_SKILL_URL,
  MANAGED_URL,
} from "@/lib/constants";
import type { ConnectionCheck, DeployStatus } from "@/lib/monitor-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ConnectionRow({ check }: { check: ConnectionCheck }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-sm border border-border bg-background/60 px-4 py-3">
      <div className="flex items-start gap-3">
        {check.connected ? (
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-arena-yes" />
        ) : (
          <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">{check.label}</p>
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
  const ready = status?.infraReady ?? false;
  const trained = status?.trainingComplete ?? false;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="label-arena">Market Radar Bestie</p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Your market-watch employee is live.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground font-body-serif">
          Bestie reads public sources through your assumptions and principles,
          then reports only what would change a decision.
        </p>
      </header>

      {status && !ready ? (
        <Alert>
          <AlertTitle>Connect the essentials</AlertTitle>
          <AlertDescription>
            One-click connect where your host supports it. Bestie stays paused until
            the checklist below is green.
          </AlertDescription>
        </Alert>
      ) : null}

      {status && ready && !trained ? (
        <Alert variant="success">
          <AlertTitle>Ready to brief Bestie</AlertTitle>
          <AlertDescription>
            Infrastructure is connected. Walk through six short steps — no docs required.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <p className="label-arena">System checklist</p>
        <div className="grid gap-2">
          {(status?.checks ?? []).map((check) => (
            <ConnectionRow key={check.id} check={check} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="label-arena">How do you want to hire?</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader>
              <CardTitle className="text-lg">Use in Claude / Codex</CardTitle>
              <CardDescription>
                Copy the self-contained skill and run Market Radar on demand.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <a href={FREE_SKILL_URL} target="_blank" rel="noopener noreferrer">
                  Get skill
                  <ExternalLinkIcon className="size-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg">Deploy your own</CardTitle>
              <CardDescription>
                Clone to your Vercel with memory and daily watch pre-wired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href={DEPLOY_YOUR_OWN_URL} target="_blank" rel="noopener noreferrer">
                  Deploy to Vercel
                  <ExternalLinkIcon className="size-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:border-primary/40">
            <CardHeader>
              <CardTitle className="text-lg">Hire managed</CardTitle>
              <CardDescription>
                Bestie wires sources, channels, graph memory, and actions for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" asChild className="w-full">
                <a href={MANAGED_URL}>Talk to Bestie</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={onStartTraining} disabled={!ready}>
          <SparklesIcon className="size-4" />
          {trained ? "Update Bestie's brief" : "Brief Bestie"}
        </Button>
        {!ready ? (
          <p className="self-center text-sm text-muted-foreground">
            Connect checklist items above first.
          </p>
        ) : null}
      </div>
    </div>
  );
}
