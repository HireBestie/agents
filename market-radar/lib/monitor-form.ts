export type DigestItem = {
  observation: { title: string; url?: string; summary?: string };
  impact: {
    stance: string;
    assumption: string;
    affectedPrinciples: string[];
  };
  recommendation: { action: string; rationale: string };
};

export type SourceEntry = {
  id: string;
  kind: "rss" | "website" | "sitemap";
  url: string;
  label: string;
  status: "active" | "disabled" | "error";
};

export type MonitorFormState = {
  operatorSummary: string;
  assumptions: string[];
  principles: string[];
  sources: SourceEntry[];
  deliveryEmail: string;
  cadenceFrequency: "daily" | "weekly" | "manual";
};

export type ConnectionCheck = {
  id: string;
  label: string;
  connected: boolean;
  detail: string;
  hint?: string;
  connectUrl?: string;
  automatic?: boolean;
};

export type DeployStatus = {
  checks: ConnectionCheck[];
  onVercel: boolean;
  infraReady: boolean;
  trainingComplete: boolean;
  hasDigest: boolean;
  configSaved: boolean;
};

export function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(items: string[]): string {
  return items.join("\n");
}

export function buildConfigPayload(form: MonitorFormState) {
  return {
    schemaVersion: 1 as const,
    operatorSummary: form.operatorSummary.trim(),
    assumptions: form.assumptions.filter(Boolean),
    principles: form.principles.filter(Boolean),
    sources: form.sources,
    cadence: {
      label: form.cadenceFrequency === "weekly" ? "Weekly watch" : "Daily watch",
      frequency: form.cadenceFrequency,
      hourUtc: 7,
      dayOfWeekUtc: 1,
    },
    escalationPolicy: "threat_and_opportunity" as const,
    sinceHours: 48,
    delivery: form.deliveryEmail.trim() ? { email: form.deliveryEmail.trim() } : {},
  };
}

export function isThreatStance(stance: string): boolean {
  const lower = stance.toLowerCase();
  return lower.includes("threat") || lower.includes("risk") || lower.includes("against");
}
