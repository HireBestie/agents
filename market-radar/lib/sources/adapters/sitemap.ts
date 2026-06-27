import { assertPublicHttpUrl, fetchTextWithByteCap } from "../../safe-url";
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from "../types";

const LOC_RE = /<loc>([^<]+)<\/loc>/gi;
const LASTMOD_RE = /<lastmod>([^<]+)<\/lastmod>/i;

function parseLastMod(block: string): string | undefined {
  const raw = block.match(LASTMOD_RE)?.[1]?.trim();
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export const sitemapSourceAdapter: SourceAdapter = {
  kind: "sitemap",
  async fetch(input: SourceFetchInput): Promise<SourceFetchResult> {
    const cutoff = Date.now() - input.sinceHours * 60 * 60 * 1000;
    try {
      const url = assertPublicHttpUrl(input.entry.url);
      const xml = await fetchTextWithByteCap(url);
      const blocks = xml.match(/<url[\s\S]*?<\/url>/gi) ?? [];
      const observations = [];

      for (const block of blocks.slice(0, 15)) {
        const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
        if (!loc || !loc.startsWith("http")) continue;
        const publishedAt = parseLastMod(block);
        if (publishedAt && Date.parse(publishedAt) < cutoff) continue;
        let pageUrl: URL;
        try {
          pageUrl = assertPublicHttpUrl(loc);
        } catch {
          continue;
        }
        observations.push({
          source: url.hostname,
          title: pageUrl.pathname.split("/").filter(Boolean).at(-1) ?? pageUrl.hostname,
          summary: `Sitemap entry from ${input.entry.label}`,
          url: pageUrl.toString(),
          ...(publishedAt ? { publishedAt } : undefined),
        });
      }

      if (observations.length === 0) {
        const locMatches = [...xml.matchAll(LOC_RE)].map((match) => match[1]?.trim());
        for (const loc of locMatches.slice(0, 10)) {
          if (!loc?.startsWith("http")) continue;
          try {
            const pageUrl = assertPublicHttpUrl(loc);
            observations.push({
              source: url.hostname,
              title: pageUrl.pathname.split("/").filter(Boolean).at(-1) ?? pageUrl.hostname,
              summary: `Sitemap entry from ${input.entry.label}`,
              url: pageUrl.toString(),
            });
          } catch {
            continue;
          }
        }
      }

      if (observations.length === 0) {
        return { observations: [], skipped: true, error: "No sitemap URLs found" };
      }

      return { observations };
    } catch (error) {
      return {
        observations: [],
        skipped: true,
        error: error instanceof Error ? error.message : "Sitemap fetch failed",
      };
    }
  },
};
