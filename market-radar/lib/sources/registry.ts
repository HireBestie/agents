import type { SourceKind } from "../monitor-config";
import {
  EXECUTABLE_SOURCE_KINDS,
  type ExecutableSourceKind,
} from "../monitor-config";
import { rssSourceAdapter } from "./adapters/rss";
import { sitemapSourceAdapter } from "./adapters/sitemap";
import { websiteSourceAdapter } from "./adapters/website";
import type { SourceAdapter } from "./types";

const ADAPTERS: SourceAdapter[] = [
  rssSourceAdapter,
  websiteSourceAdapter,
  sitemapSourceAdapter,
];

export { EXECUTABLE_SOURCE_KINDS, type ExecutableSourceKind };

export function getSourceAdapter(kind: SourceKind): SourceAdapter | undefined {
  return ADAPTERS.find((adapter) => adapter.kind === kind);
}

export function listAvailableSourceAdapters(): ExecutableSourceKind[] {
  return [...EXECUTABLE_SOURCE_KINDS];
}
