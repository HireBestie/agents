import type { BestieSeedV1, PainCoverageAssessmentV1, PainCoverageItem } from "./ontology-seed";
import type { AudiencePainId, CoverageLevel } from "./ontology-seed";
import {
  GENERIC_PROBE_SOURCE_PATTERNS,
  hasRelevantActiveSources,
  isGenericProbeSource,
} from "./ontology-seed";

export type PainCatalogEntry = {
  id: AudiencePainId;
  label: string;
  evidence: string;
  requiredCapabilities: string[];
};

export const MARKET_RADAR_PAIN_CATALOG: PainCatalogEntry[] = [
  {
    id: "found_out_too_late",
    label: "Finding out too late",
    evidence: "Competitor launch, funding raise, RFP window closed",
    requiredCapabilities: [
      "scheduled_monitoring",
      "relevant_sources",
      "digest_escalations",
    ],
  },
  {
    id: "noise_without_signal",
    label: "Google Alerts noise",
    evidence: "Too many alerts, no decision filter",
    requiredCapabilities: [
      "impact_assessment",
      "assumption_mapping",
      "noise_dropping",
    ],
  },
  {
    id: "cant_translate_to_action",
    label: "Noise without action",
    evidence: "Alerts arrive but nobody knows what to do",
    requiredCapabilities: [
      "impact_assessment",
      "assumption_mapping",
      "recommended_action",
    ],
  },
  {
    id: "nobodys_job",
    label: "Nobody owns market watch",
    evidence: "Monitoring feels like a full-time job",
    requiredCapabilities: [
      "daily_cadence",
      "delivery_channel",
      "persistent_digest_history",
    ],
  },
  {
    id: "saw_but_froze",
    label: "Saw it but did not act",
    evidence: "Battlecards/wiki/CRM but no next action",
    requiredCapabilities: [
      "recommended_action",
      "action_history",
      "managed_followup",
    ],
  },
  {
    id: "rfp_rfq_deadline",
    label: "RFP/RFQ deadlines missed",
    evidence: "RFP released too late or missed requirement",
    requiredCapabilities: [
      "tender_feed",
      "rfp_parser",
      "deadline_extraction",
    ],
  },
  {
    id: "competitor_move_missed",
    label: "Competitor move missed",
    evidence: "Local competitor pricing, territory, or product shift",
    requiredCapabilities: [
      "relevant_competitor_sources",
      "local_escalation",
    ],
  },
];

/** What self-host Market Radar supports today (honest baseline). */
export const SELF_HOST_CAPABILITIES = new Set([
  "scheduled_monitoring",
  "source_registry",
  "relevant_sources",
  "digest_escalations",
  "impact_assessment",
  "assumption_mapping",
  "recommended_action",
  "noise_dropping",
  "daily_cadence",
  "weekly_cadence",
  "delivery_channel",
  "persistent_digest_history",
  "website_monitor",
  "rss_monitor",
  "sitemap_monitor",
  "relevant_website_watch",
  "relevant_rss_watch",
  "relevant_competitor_sources",
  "local_escalation",
]);

export const MANAGED_ONLY_CAPABILITIES = new Set([
  "action_history",
  "managed_followup",
  "tender_feed",
  "rfp_parser",
  "deadline_extraction",
  "slack_delivery",
  "telegram_delivery",
  "whatsapp_delivery",
  "linkedin_monitor",
]);

function seedHasScheduledMonitoring(seed: BestieSeedV1): boolean {
  return seed.monitorSeed.monitors.some((m) => m.cadence !== "manual");
}

function seedHasActiveEmail(seed: BestieSeedV1): boolean {
  return seed.deliverySeed.destinations.some(
    (d) => d.kind === "email" && d.status === "active" && Boolean(d.target?.trim()),
  );
}

function seedHasExecutableSources(seed: BestieSeedV1): boolean {
  const executable = new Set(["rss", "website", "sitemap"]);
  return seed.sourceSeed.sources.some(
    (s) => s.status === "active" && executable.has(s.kind),
  );
}

function seedHasRelevantWebsiteWatch(seed: BestieSeedV1): boolean {
  return seed.sourceSeed.sources.some(
    (s) =>
      s.status === "active" &&
      s.kind === "website" &&
      !isGenericProbeSource(s),
  );
}

function seedHasRelevantRssWatch(seed: BestieSeedV1): boolean {
  return seed.sourceSeed.sources.some(
    (s) =>
      s.status === "active" &&
      s.kind === "rss" &&
      !isGenericProbeSource(s),
  );
}

function seedHasRelevantCompetitorSources(seed: BestieSeedV1): boolean {
  return seedHasRelevantWebsiteWatch(seed) || seedHasRelevantRssWatch(seed);
}

function seedAddressesPain(seed: BestieSeedV1, painId: AudiencePainId): boolean {
  const fromAnswers = seed.elicitationContext?.answers.some((a) =>
    a.mappedPainIds.includes(painId),
  );
  const fromAssumptions = seed.worldModelSeed.assumptions.some((a) =>
    a.originPainIds.includes(painId),
  );
  const fromPrinciples = seed.worldviewSeed.principles.some((p) =>
    p.originPainIds.includes(painId),
  );
  return Boolean(fromAnswers || fromAssumptions || fromPrinciples);
}

function assessCapability(
  capability: string,
  seed: BestieSeedV1,
  options: { hasDatabase: boolean; painId: AudiencePainId },
): CoverageLevel {
  switch (capability) {
    case "scheduled_monitoring":
      return seedHasScheduledMonitoring(seed) ? "total" : "none";
    case "source_registry":
      return seedHasExecutableSources(seed) ? "total" : "none";
    case "relevant_sources":
      return hasRelevantActiveSources(seed) ? "total" : "partial";
    case "relevant_website_watch":
      return seedHasRelevantWebsiteWatch(seed) ? "total" : "partial";
    case "relevant_rss_watch":
      return seedHasRelevantRssWatch(seed) ? "total" : "partial";
    case "relevant_competitor_sources":
      return seedHasRelevantCompetitorSources(seed) ? "total" : "partial";
    case "digest_escalations":
    case "impact_assessment":
    case "assumption_mapping":
    case "recommended_action":
    case "noise_dropping":
    case "local_escalation":
      return seed.worldModelSeed.assumptions.length > 0 &&
        seed.worldviewSeed.principles.length > 0
        ? "total"
        : "partial";
    case "daily_cadence":
      return seed.monitorSeed.monitors.some((m) => m.cadence === "daily")
        ? "total"
        : "partial";
    case "weekly_cadence":
      return seed.monitorSeed.monitors.some((m) => m.cadence === "weekly")
        ? "total"
        : "partial";
    case "delivery_channel":
      return seedHasActiveEmail(seed) ? "total" : "partial";
    case "persistent_digest_history":
      return options.hasDatabase ? "total" : "partial";
    case "website_monitor":
      return seed.sourceSeed.sources.some(
        (s) => s.kind === "website" && s.status === "active",
      )
        ? "total"
        : "partial";
    case "rss_monitor":
      return seed.sourceSeed.sources.some((s) => s.kind === "rss" && s.status === "active")
        ? "total"
        : "partial";
    case "sitemap_monitor":
      return seed.sourceSeed.sources.some((s) => s.kind === "sitemap" && s.status === "active")
        ? "total"
        : "partial";
    case "tender_feed":
    case "rfp_parser":
    case "deadline_extraction":
    case "action_history":
    case "managed_followup":
    case "slack_delivery":
    case "telegram_delivery":
    case "whatsapp_delivery":
    case "linkedin_monitor":
      return "none";
    default:
      return "partial";
  }
}

function mergeLevels(levels: CoverageLevel[]): CoverageLevel {
  if (levels.length === 0) return "none";
  if (levels.every((l) => l === "total")) return "total";
  if (levels.every((l) => l === "none")) return "none";
  return "partial";
}

function strictPainCoverage(
  painId: AudiencePainId,
  rawCoverage: CoverageLevel,
  seed: BestieSeedV1,
): CoverageLevel {
  if (rawCoverage === "none") return "none";

  const painRelevant = seedAddressesPain(seed, painId);

  switch (painId) {
    case "found_out_too_late":
      if (
        !seedHasScheduledMonitoring(seed) ||
        !hasRelevantActiveSources(seed) ||
        !seedHasActiveEmail(seed)
      ) {
        return "partial";
      }
      return rawCoverage;
    case "competitor_move_missed":
      if (!seedHasRelevantCompetitorSources(seed)) {
        return painRelevant ? "partial" : "none";
      }
      return rawCoverage;
    case "rfp_rfq_deadline":
      return "none";
    case "saw_but_froze":
      return "partial";
    case "noise_without_signal":
    case "cant_translate_to_action":
      return seed.worldModelSeed.assumptions.length > 0 &&
        seed.worldviewSeed.principles.length > 0
        ? "total"
        : "partial";
    case "nobodys_job":
      if (!seedHasScheduledMonitoring(seed) || !seedHasActiveEmail(seed)) {
        return "partial";
      }
      return rawCoverage;
    default:
      return rawCoverage;
  }
}

export function assessPainCoverage(
  seed: BestieSeedV1,
  options: { hasDatabase?: boolean } = {},
): PainCoverageAssessmentV1 {
  const hasDatabase = options.hasDatabase ?? false;
  const items: PainCoverageItem[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const pain of MARKET_RADAR_PAIN_CATALOG) {
    const capabilityLevels = pain.requiredCapabilities.map((cap) =>
      assessCapability(cap, seed, { hasDatabase, painId: pain.id }),
    );
    const rawCoverage = mergeLevels(capabilityLevels);
    const coverage = strictPainCoverage(pain.id, rawCoverage, seed);

    const supportedNow: string[] = [];
    const missing: string[] = [];
    const managedOnly: string[] = [];

    for (const cap of pain.requiredCapabilities) {
      const level = assessCapability(cap, seed, { hasDatabase, painId: pain.id });
      if (level === "total" && SELF_HOST_CAPABILITIES.has(cap)) {
        supportedNow.push(cap);
      } else if (MANAGED_ONLY_CAPABILITIES.has(cap)) {
        managedOnly.push(cap);
      } else if (level === "none" || level === "partial") {
        missing.push(cap);
      }
    }

    if (
      coverage !== "total" &&
      !hasRelevantActiveSources(seed) &&
      pain.requiredCapabilities.includes("relevant_sources")
    ) {
      if (!missing.includes("relevant_sources")) {
        missing.push("relevant_sources");
      }
    }

    const requestable = missing.length > 0 || managedOnly.length > 0;

    items.push({
      painId: pain.id,
      coverage,
      supportedNow,
      missing,
      managedOnly,
      requestable,
    });

    if (coverage === "total") {
      strengths.push(`${pain.label}: covered with relevant sources`);
    } else if (coverage === "partial") {
      weaknesses.push(`${pain.label}: partially covered — add sources or request support`);
    } else {
      weaknesses.push(`${pain.label}: not covered yet`);
    }
  }

  const genericOnly =
    seedHasExecutableSources(seed) && !hasRelevantActiveSources(seed);
  if (genericOnly) {
    weaknesses.push(
      `Only generic probe feeds detected (${GENERIC_PROBE_SOURCE_PATTERNS.map((p) => p.source).join(", ")}). Add competitor or industry sources.`,
    );
  }

  return {
    schemaVersion: 1,
    items,
    strengths,
    weaknesses,
  };
}

export function painLabel(painId: AudiencePainId): string {
  return MARKET_RADAR_PAIN_CATALOG.find((p) => p.id === painId)?.label ?? painId;
}

export function capabilityLabel(capability: string): string {
  const labels: Record<string, string> = {
    scheduled_monitoring: "Scheduled monitoring",
    source_registry: "Source registry",
    relevant_sources: "Relevant watch sources",
    digest_escalations: "Digest escalations",
    impact_assessment: "Impact assessment",
    assumption_mapping: "Assumption mapping",
    recommended_action: "Recommended actions",
    noise_dropping: "Noise filtering",
    daily_cadence: "Daily cadence",
    delivery_channel: "Email delivery",
    persistent_digest_history: "Digest history",
    tender_feed: "Tender/RFP feeds",
    rfp_parser: "RFP parsing",
    deadline_extraction: "Deadline extraction",
    action_history: "Action history",
    managed_followup: "Managed follow-up",
    website_monitor: "Website monitoring",
    rss_monitor: "RSS monitoring",
    relevant_website_watch: "Competitor website watch",
    relevant_rss_watch: "Industry RSS watch",
    relevant_competitor_sources: "Competitor/industry source watch",
    linkedin_monitor: "LinkedIn monitoring",
    slack_delivery: "Slack delivery",
    telegram_delivery: "Telegram delivery",
    whatsapp_delivery: "WhatsApp delivery",
    local_escalation: "Threat/opportunity escalation",
  };
  return labels[capability] ?? capability.replaceAll("_", " ");
}
