import type { MarketRadarObservation } from "../lite-schema";
import type { SourceKind, SourceRegistryEntry } from "../monitor-config";

export type SourceAvailability =
  | "available_now"
  | "available_with_key"
  | "managed_only"
  | "request_support";

export const SOURCE_CATALOG: Record<
  SourceKind | string,
  { label: string; availability: SourceAvailability; note?: string }
> = {
  rss: { label: "RSS / Atom feed", availability: "available_now" },
  website: { label: "Public website URL", availability: "available_now" },
  sitemap: { label: "Sitemap URL", availability: "available_now" },
  search_query: {
    label: "Web/news search",
    availability: "available_with_key",
    note: "Requires Exa or Brave API key — request support if you need help wiring it.",
  },
  tender_feed: {
    label: "Public tender feed",
    availability: "request_support",
  },
  regulatory_feed: {
    label: "Regulatory feed",
    availability: "request_support",
  },
  x: { label: "X / Twitter", availability: "managed_only" },
  polymarket: { label: "Polymarket", availability: "managed_only" },
  kalshi: { label: "Kalshi", availability: "managed_only" },
  exa_monitor: { label: "Exa monitor", availability: "managed_only" },
  google_news: { label: "Google News", availability: "request_support" },
  sec_filings: { label: "SEC filings", availability: "request_support" },
  linkedin: { label: "LinkedIn / company pages", availability: "request_support" },
};

export type SourceFetchInput = {
  entry: SourceRegistryEntry;
  sinceHours: number;
};

export type SourceFetchResult = {
  observations: MarketRadarObservation[];
  skipped?: boolean;
  error?: string;
};

export interface SourceAdapter {
  kind: SourceKind;
  fetch(input: SourceFetchInput): Promise<SourceFetchResult>;
}

export type FetchedObservation = MarketRadarObservation & {
  sourceId: string;
  sourceKind: SourceKind;
  sourceUrl: string;
};
