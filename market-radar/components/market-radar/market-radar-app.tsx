"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2Icon } from "lucide-react";

import { DigestSurface } from "@/components/market-radar/digest-surface";
import { TrainWizard } from "@/components/market-radar/train-wizard";
import { WatchRoomSurface } from "@/components/market-radar/watch-room";
import { WelcomeSurface } from "@/components/market-radar/welcome-surface";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_BUSINESS,
  DEFAULT_PRINCIPLES,
  DEFAULT_SOURCES,
} from "@/lib/constants";
import type { DeployStatus, DigestItem, MonitorFormState } from "@/lib/monitor-form";
import type { WatchRoomSnapshot } from "@/lib/db/watch-store";

type DigestPayload = {
  escalations: DigestItem[];
  morningBrief: DigestItem[];
  droppedCount: number;
  digestMarkdown?: string;
};

export function MarketRadarApp() {
  const [tab, setTab] = useState("welcome");
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [watch, setWatch] = useState<WatchRoomSnapshot | null>(null);
  const [watchConfigured, setWatchConfigured] = useState(false);
  const [digest, setDigest] = useState<DigestPayload | null>(null);
  const [digestMarkdown, setDigestMarkdown] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<
    Array<{ channel: string; ok: boolean; error?: string }> | undefined
  >();
  const [loadingDigest, setLoadingDigest] = useState(true);
  const [loadingWatch, setLoadingWatch] = useState(true);

  const [form, setForm] = useState<MonitorFormState>({
    operatorSummary: DEFAULT_BUSINESS,
    assumptions: DEFAULT_ASSUMPTIONS,
    principles: DEFAULT_PRINCIPLES,
    sources: DEFAULT_SOURCES,
    deliveryEmail: "",
    cadenceFrequency: "daily",
  });

  const refreshStatus = useCallback(async () => {
    const response = await fetch("/api/status");
    const data = (await response.json()) as DeployStatus;
    setStatus(data);
  }, []);

  const refreshDigest = useCallback(async () => {
    setLoadingDigest(true);
    try {
      const response = await fetch("/api/digest/latest");
      const data = (await response.json()) as {
        digest?: DigestPayload;
        digestMarkdown?: string | null;
      };
      setDigest(data.digest ?? null);
      setDigestMarkdown(data.digestMarkdown ?? data.digest?.digestMarkdown ?? null);
    } finally {
      setLoadingDigest(false);
    }
  }, []);

  const refreshWatch = useCallback(async () => {
    setLoadingWatch(true);
    try {
      const response = await fetch("/api/watch");
      const data = (await response.json()) as {
        configured: boolean;
        watch: WatchRoomSnapshot | null;
      };
      setWatchConfigured(data.configured);
      setWatch(data.watch);
    } finally {
      setLoadingWatch(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    const response = await fetch("/api/config");
    const data = (await response.json()) as {
      config?: {
        operatorSummary: string;
        assumptions: string[];
        principles: string[];
        sources: MonitorFormState["sources"];
        delivery?: { email?: string };
        cadence?: { frequency: MonitorFormState["cadenceFrequency"] };
      };
    };
    if (data.config) {
      setForm({
        operatorSummary: data.config.operatorSummary,
        assumptions: data.config.assumptions,
        principles: data.config.principles,
        sources: data.config.sources as MonitorFormState["sources"],
        deliveryEmail: data.config.delivery?.email ?? "",
        cadenceFrequency: data.config.cadence?.frequency ?? "daily",
      });
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      refreshStatus(),
      refreshDigest(),
      refreshWatch(),
      loadConfig(),
    ]);
  }, [refreshStatus, refreshDigest, refreshWatch, loadConfig]);

  function handleStartTraining() {
    setTab("train");
  }

  function handleRunComplete() {
    void refreshDigest();
    void refreshWatch();
    void refreshStatus();
    setTab("digest");
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <div className="mx-auto max-w-4xl px-5 py-8 md:py-12">
          <div className="mb-8 flex items-center justify-end">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="font-data text-xs">
                  <Settings2Icon className="size-4" />
                  Advanced
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Deployment diagnostics</SheetTitle>
                  <SheetDescription>
                    Technical details — not required for onboarding.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4 font-data text-xs leading-relaxed text-muted-foreground">
                  <p>
                    <strong className="text-foreground">POSTGRES_URL</strong> — durable
                    memory (Neon on Vercel)
                  </p>
                  <p>
                    <strong className="text-foreground">AI Gateway</strong> —{" "}
                    AI_GATEWAY_API_KEY or Vercel OIDC
                  </p>
                  <p>
                    <strong className="text-foreground">CRON_SECRET</strong> — secures
                    scheduled runs
                  </p>
                  <p>
                    <strong className="text-foreground">RESEND_API_KEY</strong> +{" "}
                    MARKET_RADAR_FROM_EMAIL — email delivery
                  </p>
                  <p>
                    <strong className="text-foreground">MARKET_RADAR_RUN_TOKEN</strong> —
                    optional run auth
                  </p>
                  {status?.onVercel ? (
                    <p className="text-arena-yes">Running on Vercel</p>
                  ) : (
                    <p>Local / custom host</p>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-8 w-full flex-wrap h-auto">
              <TabsTrigger value="welcome">Welcome</TabsTrigger>
              <TabsTrigger value="train">Train Bestie</TabsTrigger>
              <TabsTrigger value="watch">Watch room</TabsTrigger>
              <TabsTrigger value="digest">Digest</TabsTrigger>
            </TabsList>

            <TabsContent value="welcome">
              <WelcomeSurface status={status} onStartTraining={handleStartTraining} />
            </TabsContent>

            <TabsContent value="train">
              <TrainWizard
                form={form}
                onChange={setForm}
                onComplete={() => {
                  void refreshWatch();
                  void refreshStatus();
                }}
                onRunComplete={handleRunComplete}
              />
            </TabsContent>

            <TabsContent value="watch">
              <WatchRoomSurface
                watch={watch}
                loading={loadingWatch}
                configured={watchConfigured}
              />
            </TabsContent>

            <TabsContent value="digest">
              <DigestSurface
                digest={digest}
                digestMarkdown={digestMarkdown}
                deliveries={deliveries}
                loading={loadingDigest}
                onRefresh={refreshDigest}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
