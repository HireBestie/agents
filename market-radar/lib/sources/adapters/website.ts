import { assertPublicHttpUrl, fetchTextWithByteCap } from "../../safe-url";
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from "../types";

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const META_DESC_RE =
  /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i;
const H1_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
const P_RE = /<p[^>]*>([\s\S]*?)<\/p>/i;

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const websiteSourceAdapter: SourceAdapter = {
  kind: "website",
  async fetch(input: SourceFetchInput): Promise<SourceFetchResult> {
    try {
      const url = assertPublicHttpUrl(input.entry.url);
      const html = await fetchTextWithByteCap(url);
      const title =
        stripHtml(html.match(TITLE_RE)?.[1] ?? "") ||
        stripHtml(html.match(H1_RE)?.[1] ?? "") ||
        input.entry.label;
      const summary =
        stripHtml(html.match(META_DESC_RE)?.[1] ?? "") ||
        stripHtml(html.match(P_RE)?.[1] ?? "") ||
        "No summary extracted from page.";
      if (!title) {
        return { observations: [], skipped: true, error: "No title found" };
      }
      return {
        observations: [
          {
            source: url.hostname,
            title: title.slice(0, 240),
            summary: summary.slice(0, 500),
            url: url.toString(),
          },
        ],
      };
    } catch (error) {
      return {
        observations: [],
        skipped: true,
        error: error instanceof Error ? error.message : "Website fetch failed",
      };
    }
  },
};
