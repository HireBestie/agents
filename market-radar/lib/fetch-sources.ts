import type { MarketRadarObservation } from "./lite-schema";
import {
  assertPublicSourceList,
  fetchTextWithByteCap,
} from "./safe-url";

const TAG_RE = /<title[^>]*>([^<]+)<\/title>/i;
const ITEM_RE = /<item[\s\S]*?<\/item>/gi;
const LINK_RE = /<link[^>]*>([^<]+)<\/link>/i;
const DESC_RE = /<description[^>]*>([^<]+)<\/description>/i;
const PUBDATE_RE = /<pubDate[^>]*>([^<]+)<\/pubDate>/i;

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
}

function parsePublishedAt(raw: string): string | undefined {
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export function parseRssItems(
  xml: string,
  sourceUrl: string,
): MarketRadarObservation[] {
  const items: MarketRadarObservation[] = [];
  const blocks = xml.match(ITEM_RE) ?? [];
  for (const block of blocks.slice(0, 15)) {
    const title = stripCdata(
      block.match(TAG_RE)?.[1] ??
        block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ??
        "",
    );
    if (!title) continue;
    const link = stripCdata(block.match(LINK_RE)?.[1] ?? sourceUrl);
    const summary = stripCdata(
      block.match(DESC_RE)?.[1] ?? "No summary available from feed.",
    ).slice(0, 500);
    const publishedAt = parsePublishedAt(
      stripCdata(block.match(PUBDATE_RE)?.[1] ?? ""),
    );
    items.push({
      source: new URL(sourceUrl).hostname,
      title,
      summary,
      url: link.startsWith("http") ? link : sourceUrl,
      ...(publishedAt ? { publishedAt } : undefined),
    });
  }
  return items;
}

export async function fetchPublicObservations(
  sources: string[],
  sinceHours: number,
): Promise<{ observations: MarketRadarObservation[]; skippedSources: string[] }> {
  const cutoff = Date.now() - sinceHours * 60 * 60 * 1000;
  const observations: MarketRadarObservation[] = [];
  const skippedSources: string[] = [];
  const validatedSources = assertPublicSourceList(sources);

  for (const source of validatedSources) {
    try {
      const url = new URL(source);
      const body = await fetchTextWithByteCap(url);
      const parsed = parseRssItems(body, source);
      if (parsed.length === 0) {
        skippedSources.push(source);
        continue;
      }
      for (const item of parsed) {
        if (item.publishedAt && Date.parse(item.publishedAt) < cutoff) continue;
        observations.push(item);
      }
    } catch {
      skippedSources.push(source);
    }
  }

  return { observations, skippedSources };
}
