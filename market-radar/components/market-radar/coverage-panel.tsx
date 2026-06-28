"use client";

import { Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { capabilityLabel, painLabel } from "@/lib/pain-coverage";
import type { PainCoverageAssessmentV1 } from "@/lib/ontology-seed";
import { MANAGED_URL } from "@/lib/constants";

type CoveragePanelProps = {
  coverage: PainCoverageAssessmentV1;
  onRequest: (painId: string, capability: string) => Promise<void>;
  requesting?: string | null;
};

function coverageBadgeVariant(
  level: "none" | "partial" | "total",
): "success" | "primary" | "threat" {
  if (level === "total") return "success";
  if (level === "partial") return "primary";
  return "threat";
}

function coverageLabel(level: "none" | "partial" | "total"): string {
  if (level === "total") return "Covered";
  if (level === "partial") return "Partial";
  return "Not yet";
}

function requestKey(painId: string, capability: string): string {
  return `${painId}:${capability}`;
}

export function CoveragePanel({
  coverage,
  onRequest,
  requesting,
}: CoveragePanelProps) {
  const strong = coverage.items.filter((i) => i.coverage === "total");
  const weak = coverage.items.filter((i) => i.coverage !== "total");
  const totals = {
    total: coverage.items.filter((i) => i.coverage === "total").length,
    partial: coverage.items.filter((i) => i.coverage === "partial").length,
    none: coverage.items.filter((i) => i.coverage === "none").length,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-pitch-claim-border bg-pitch-claim-bg px-4 py-4">
        <p className="label-arena mb-2">Open-core coverage map</p>
        <p className="font-display text-xl font-semibold text-pitch-claim">
          Tell us what this Bestie should cover next.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The core agent is intentionally honest: covered, partial, or not yet.
          Every request becomes roadmap signal for new sources, channels, and
          managed capabilities.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center font-data text-xs">
          <div className="rounded-sm border border-border bg-background/70 p-2">
            <p className="text-arena-yes">{totals.total}</p>
            <p className="text-muted-foreground">covered</p>
          </div>
          <div className="rounded-sm border border-border bg-background/70 p-2">
            <p className="text-primary">{totals.partial}</p>
            <p className="text-muted-foreground">partial</p>
          </div>
          <div className="rounded-sm border border-border bg-background/70 p-2">
            <p className="text-arena-no">{totals.none}</p>
            <p className="text-muted-foreground">not yet</p>
          </div>
        </div>
      </div>

      <div>
        <p className="label-arena mb-3">What this Market Radar covers well</p>
        {strong.length === 0 ? (
          <p className="text-sm text-muted-foreground">Compile your brief to see coverage.</p>
        ) : (
          <ul className="space-y-2">
            {strong.map((item) => (
              <li
                key={item.painId}
                className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-sm"
              >
                <span>{painLabel(item.painId)}</span>
                <Badge variant={coverageBadgeVariant(item.coverage)}>
                  {coverageLabel(item.coverage)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="label-arena mb-3">Still weak / request support</p>
        {weak.length === 0 ? (
          <p className="text-sm text-muted-foreground">No gaps flagged.</p>
        ) : (
          <ul className="space-y-3">
            {weak.map((item) => (
              <li
                key={item.painId}
                className="rounded-sm border border-border px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{painLabel(item.painId)}</span>
                  <Badge variant={coverageBadgeVariant(item.coverage)}>
                    {item.coverage === "partial" ? "Partial" : "Not yet"}
                  </Badge>
                </div>
                {item.missing.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Missing: {item.missing.map(capabilityLabel).join(", ")}
                  </p>
                ) : null}
                {item.managedOnly.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Managed Bestie: {item.managedOnly.map(capabilityLabel).join(", ")}
                  </p>
                ) : null}
                {item.requestable ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...item.missing, ...item.managedOnly].map((capability) => {
                      const key = requestKey(item.painId, capability);
                      return (
                        <Button
                          key={key}
                          variant="outline"
                          size="sm"
                          disabled={requesting === key}
                          onClick={() => void onRequest(item.painId, capability)}
                        >
                          {requesting === key ? (
                            <Loader2Icon className="size-3 animate-spin" />
                          ) : null}
                          Request {capabilityLabel(capability)}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-sm border border-pitch-claim-border bg-pitch-claim-bg px-4 py-3 text-sm">
        <p className="font-display font-semibold text-pitch-claim">
          Want full coverage?
        </p>
        <p className="mt-1 text-muted-foreground">
          Import this seed into managed Bestie for graph memory, action history, and
          Slack/WhatsApp/Telegram delivery.
        </p>
        <Button variant="link" className="mt-2 h-auto p-0" asChild>
          <a href={MANAGED_URL}>Hire managed Market Radar</a>
        </Button>
      </div>
    </div>
  );
}
