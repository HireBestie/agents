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
import type { DeployStatus, DigestItem } from "@/lib/monitor-form";
import type { BestieSeedV1 } from "@/lib/ontology-seed";
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
  const [bestieSeed, setBestieSeed] = useState<BestieSeedV1 | null>(null);
  const [digest, setDigest] = useState<DigestPayload | null>(null);
  const [digestMarkdown, setDigestMarkdown] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<
    Array<{ channel: string; ok: boolean; error?: string }> | undefined
  >();
  const [loadingDigest, setLoadingDigest] = useState(true);
  const [loadingWatch, setLoadingWatch] = useState(true);

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
      bestieSeed?: BestieSeedV1 | null;
    };
    if (data.bestieSeed) {
      setBestieSeed(data.bestieSeed);
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
    void loadConfig();
    setTab("digest");
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <div className="mx-auto max-w-5xl px-5 py-8 md:py-12">
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
                  {bestieSeed ? (
                    <p className="text-arena-yes">Bestie seed saved (v0.5)</p>
                  ) : null}
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
                initialSeed={bestieSeed}
                deployStatus={status}
                onComplete={() => {
                  void refreshWatch();
                  void refreshStatus();
                  void loadConfig();
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
