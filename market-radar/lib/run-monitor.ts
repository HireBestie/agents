import type { MarketRadarRunRequest } from "./lite-schema";
import { deliverDigest } from "./delivery/dispatch";
import { splitDigest } from "./digest";
import type { MarketRadarMonitorConfig } from "./monitor-config";
import { persistRadarRun, readMonitorConfig } from "./persistence";
import { runMarketRadar } from "./run-radar";

export async function executeMonitorRun(input: {
  request: MarketRadarRunRequest;
  trigger: "manual" | "cron";
  config?: MarketRadarMonitorConfig | null;
}) {
  const { outcome, rawObservations } = await runMarketRadar(input.request);
  const digest = splitDigest(outcome);
  const config = input.config ?? (await readMonitorConfig());
  const deliveryEmail = config?.delivery?.email?.trim();
  const persisted = await persistRadarRun({
    trigger: input.trigger,
    outcome,
    digest,
    rawObservations,
    deliveryTargets: deliveryEmail
      ? [{ channel: "email", target: deliveryEmail }]
      : undefined,
  });
  const deliveries = await deliverDigest({
    digest,
    digestId: persisted.digestId,
    config,
  });

  return {
    outcome,
    digest,
    digestMarkdown: digest.digestMarkdown,
    runId: persisted.runId,
    digestId: persisted.digestId,
    deliveries,
  };
}
