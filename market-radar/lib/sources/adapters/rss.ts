import { parseRssItems } from "../../fetch-sources";
import { assertPublicHttpUrl, fetchTextWithByteCap } from "../../safe-url";
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from "../types";

function parsePublishedAt(raw: string): string | undefined {
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export const rssSourceAdapter: SourceAdapter = {
  kind: "rss",
  async fetch(input: SourceFetchInput): Promise<SourceFetchResult> {
    const cutoff = Date.now() - input.sinceHours * 60 * 60 * 1000;
    try {
      const url = assertPublicHttpUrl(input.entry.url);
      const body = await fetchTextWithByteCap(url);
      const parsed = parseRssItems(body, input.entry.url);
      if (parsed.length === 0) {
        return { observations: [], skipped: true };
      }
      const observations = parsed.filter((item) => {
        if (!item.publishedAt) return true;
        return Date.parse(item.publishedAt) >= cutoff;
      });
      return { observations };
    } catch (error) {
      return {
        observations: [],
        skipped: true,
        error: error instanceof Error ? error.message : "RSS fetch failed",
      };
    }
  },
};

export { parsePublishedAt };
