"use client";

import { Loader2Icon, RefreshCwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PitchCardRail } from "@/components/market-radar/pitch-card-rail";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DigestItem } from "@/lib/monitor-form";

type DigestData = {
  escalations: DigestItem[];
  morningBrief: DigestItem[];
  droppedCount: number;
  digestMarkdown?: string;
  notes?: string;
};

export function DigestSurface({
  digest,
  digestMarkdown,
  deliveries,
  loading,
  onRefresh,
}: {
  digest: DigestData | null;
  digestMarkdown: string | null;
  deliveries?: Array<{ channel: string; ok: boolean; error?: string }>;
  loading: boolean;
  onRefresh: () => void;
}) {
  const emailDelivery = deliveries?.find((d) => d.channel === "email");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="card-editorial space-y-4 p-10 text-center">
        <p className="font-display text-2xl font-semibold">No digest yet</p>
        <p className="text-muted-foreground font-body-serif">
          Brief Bestie and run a scan — your argument-chain digest will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-arena">Morning intelligence</p>
          <h2 className="font-display text-3xl font-semibold">Latest digest</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {digest.escalations.length} escalation
            {digest.escalations.length === 1 ? "" : "s"} ·{" "}
            {digest.morningBrief.length} keeper
            {digest.morningBrief.length === 1 ? "" : "s"} · {digest.droppedCount}{" "}
            dropped as noise
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCwIcon className="size-4" />
          Refresh
        </Button>
      </header>

      {emailDelivery ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="label-arena">Email</span>
          <Badge variant={emailDelivery.ok ? "success" : "threat"}>
            {emailDelivery.ok ? "Delivered" : "Failed"}
          </Badge>
          {emailDelivery.error ? (
            <span className="font-data text-xs text-muted-foreground">
              {emailDelivery.error}
            </span>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-4">
        <p className="label-arena">Escalations</p>
        {digest.escalations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No escalations this run.</p>
        ) : (
          digest.escalations.map((item, index) => (
            <PitchCardRail key={`esc-${item.observation.title}-${index}`} item={item} index={index} />
          ))
        )}
      </section>

      <section className="space-y-4">
        <p className="label-arena">Morning brief</p>
        {digest.morningBrief.length === 0 ? (
          <p className="text-sm text-muted-foreground">No additional keepers.</p>
        ) : (
          digest.morningBrief.map((item, index) => (
            <PitchCardRail key={`brief-${item.observation.title}-${index}`} item={item} index={index} />
          ))
        )}
      </section>

      {digestMarkdown ? (
        <Accordion type="single" collapsible>
          <AccordionItem value="markdown">
            <AccordionTrigger className="label-arena">
              Export markdown
            </AccordionTrigger>
            <AccordionContent>
              <pre className="overflow-x-auto rounded-sm border border-border bg-card p-4 font-data text-xs leading-relaxed whitespace-pre-wrap">
                {digestMarkdown}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  );
}
