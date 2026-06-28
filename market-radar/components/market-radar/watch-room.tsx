"use client";

import { Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WatchRoomSnapshot } from "@/lib/db/watch-store";

export function WatchRoomSurface({
  watch,
  loading,
  configured,
}: {
  watch: WatchRoomSnapshot | null;
  loading: boolean;
  configured: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="card-editorial space-y-3 p-10 text-center">
        <p className="font-display text-2xl font-semibold">Watch room opens after briefing</p>
        <p className="text-muted-foreground font-body-serif">
          Train Bestie first — then monitor sources, runs, and deliveries here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="label-arena">Operations</p>
        <h2 className="font-display text-3xl font-semibold">Watch room</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-editorial p-5">
          <p className="label-arena mb-2">Status</p>
          <Badge variant="success">Active</Badge>
        </div>
        <div className="card-editorial p-5">
          <p className="label-arena mb-2">Next run</p>
          <p className="text-sm">{watch?.nextRunLabel ?? "Daily · 07:00 UTC"}</p>
        </div>
        <div className="card-editorial p-5">
          <p className="label-arena mb-2">Last run</p>
          <p className="text-sm font-data">
            {watch?.lastRun ?
              new Date(watch.lastRun.finishedAt).toLocaleString()
            : "Not yet"}
          </p>
          {watch?.lastRun ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {watch.lastRun.trigger} · {watch.lastRun.droppedCount} dropped
            </p>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <p className="label-arena">Sources</p>
        <div className="grid gap-2">
          {(watch?.sources ?? []).map((source) => (
            <div
              key={source.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Badge variant={source.executable ? "watching" : "outline"}>
                  {source.kind}
                </Badge>
                <span className="text-sm">{source.label}</span>
              </div>
              <Badge variant={source.status === "active" ? "success" : "outline"}>
                {source.executable ? source.status : "backlog"}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {watch?.deliveries?.length ? (
        <section className="space-y-3">
          <p className="label-arena">Recent deliveries</p>
          <div className="grid gap-2">
            {watch.deliveries.map((d, i) => (
              <div
                key={`${d.channel}-${d.target}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-4 py-3 text-sm"
              >
                <span className="font-data">{d.channel}</span>
                <span className="text-muted-foreground">{d.target}</span>
                <Badge variant={d.status === "sent" ? "success" : "threat"}>
                  {d.status}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {watch?.sourceRequests?.length ? (
        <section className="space-y-3">
          <p className="label-arena">Source requests</p>
          <div className="grid gap-2">
            {watch.sourceRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-sm border border-border px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{req.kind}</Badge>
                  <Badge variant="watching">{req.status}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{req.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
