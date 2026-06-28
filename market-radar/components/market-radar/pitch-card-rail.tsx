import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DigestItem } from "@/lib/monitor-form";
import { isThreatStance } from "@/lib/monitor-form";

type RailStep = {
  label: string;
  value: string;
  chipClass: string;
};

function buildSteps(item: DigestItem): RailStep[] {
  const threat = isThreatStance(item.impact.stance);
  return [
    {
      label: "Source",
      value: item.observation.title,
      chipClass: "pitch-chip-exhibit",
    },
    {
      label: "Signal",
      value: item.observation.title,
      chipClass: "pitch-chip-claim",
    },
    {
      label: "Assumption",
      value: item.impact.assumption,
      chipClass: "pitch-chip-warrant",
    },
    {
      label: "Principle",
      value: item.impact.affectedPrinciples.join(" · ") || "—",
      chipClass: "pitch-chip-chain",
    },
    {
      label: threat ? "Risk" : "Action",
      value: item.recommendation.action,
      chipClass: threat ? "pitch-chip-rebuttal" : "pitch-chip-claim",
    },
  ];
}

export function PitchCardRail({
  item,
  index = 0,
}: {
  item: DigestItem;
  index?: number;
}) {
  const steps = buildSteps(item);
  const threat = isThreatStance(item.impact.stance);

  return (
    <article
      className="animate-fade-up card-editorial p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={threat ? "threat" : "primary"}>{item.impact.stance}</Badge>
        {item.observation.url ? (
          <a
            href={item.observation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-data text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {new URL(item.observation.url).hostname}
          </a>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, stepIndex) => (
          <div key={step.label} className="flex items-start gap-2">
            {stepIndex > 0 ? (
              <ArrowRightIcon className="mt-2 size-3 shrink-0 text-muted-foreground" />
            ) : (
              <span className="mt-2 size-3 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="label-arena mb-1">{step.label}</p>
              <p
                className={cn(
                  "rounded-sm border px-3 py-2 text-sm leading-snug",
                  step.chipClass,
                )}
              >
                {step.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {item.recommendation.rationale ? (
        <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground font-body-serif">
          {item.recommendation.rationale}
        </p>
      ) : null}
    </article>
  );
}
