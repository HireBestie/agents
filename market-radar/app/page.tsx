"use client";

import { useEffect, useState } from "react";

const MANAGED_URL =
  "https://hirebestie.com/agents/market-radar?utm_source=deploy_app&utm_medium=upsell&utm_campaign=market_radar_deploy";

type DigestItem = {
  observation: { title: string; url?: string };
  impact: {
    stance: string;
    assumption: string;
    affectedPrinciples: string[];
  };
  recommendation: { action: string; rationale: string };
};

type SourceCatalogEntry = {
  kind: string;
  label: string;
  availability: string;
  note?: string;
  adapterReady?: boolean;
};

type DigestResponse = {
  digest?: {
    escalations: DigestItem[];
    morningBrief: DigestItem[];
    droppedCount: number;
    digestMarkdown?: string;
    notes?: string;
  };
  digestMarkdown?: string;
  deliveries?: Array<{ channel: string; ok: boolean; error?: string }>;
  error?: string;
};

function linesToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSourceLines(value: string) {
  return linesToList(value).map((line, index) => {
    const parts = line.split(/\s+/);
    const knownKinds = ["rss", "website", "sitemap"] as const;
    if (parts.length >= 2 && knownKinds.includes(parts[0] as (typeof knownKinds)[number])) {
      const kind = parts[0] as (typeof knownKinds)[number];
      const url = parts.slice(1).join(" ");
      return {
        id: `source-${index + 1}`,
        kind,
        url,
        label: new URL(url).hostname,
        status: "active" as const,
      };
    }
    return {
      id: `source-${index + 1}`,
      kind: "rss" as const,
      url: line,
      label: new URL(line).hostname,
      status: "active" as const,
    };
  });
}

function sourcesToLines(
  sources: Array<{ kind: string; url: string }> | undefined,
): string {
  if (!sources?.length) {
    return "https://feeds.bbci.co.uk/news/rss.xml";
  }
  return sources
    .map((source) =>
      source.kind === "rss" ? source.url : `${source.kind} ${source.url}`,
    )
    .join("\n");
}

export default function MarketRadarPage() {
  const [operatorSummary, setOperatorSummary] = useState(
    "Regional HVAC installer serving residential retrofits in the US Midwest.",
  );
  const [assumptions, setAssumptions] = useState(
    "Financing terms decide our quote win rate this quarter\nCopper input costs stay flat through Q3",
  );
  const [principles, setPrinciples] = useState(
    "Compete on total cost of ownership, not sticker price\nAct on confirmed local competitor moves",
  );
  const [sources, setSources] = useState(
    "https://feeds.bbci.co.uk/news/rss.xml",
  );
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [cadenceFrequency, setCadenceFrequency] = useState<
    "daily" | "weekly" | "manual"
  >("daily");
  const [runToken, setRunToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [result, setResult] = useState<DigestResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<SourceCatalogEntry[]>([]);
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; kind: string; url: string; label: string }>
  >([]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/digest/latest").then((response) => response.json()),
      fetch("/api/sources/catalog").then((response) => response.json()),
      fetch("/api/config").then((response) => response.json()),
    ])
      .then(([digestData, catalogData, configData]) => {
        if (digestData.digest) setResult(digestData);
        if (catalogData.catalog) setCatalog(catalogData.catalog);
        if (configData.config) {
          setOperatorSummary(configData.config.operatorSummary);
          setAssumptions(configData.config.assumptions.join("\n"));
          setPrinciples(configData.config.principles.join("\n"));
          setSources(sourcesToLines(configData.config.sources));
          setDeliveryEmail(configData.config.delivery?.email ?? "");
          setCadenceFrequency(configData.config.cadence?.frequency ?? "daily");
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleRun() {
    setLoading(true);
    setResult(null);
    setStatus(null);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorSummary,
          assumptions: linesToList(assumptions),
          principles: linesToList(principles),
          sourceRegistry: parseSourceLines(sources),
          sinceHours: 48,
          ...(runToken.trim() ? { runToken: runToken.trim() } : {}),
        }),
      });
      const data = (await response.json()) as DigestResponse;
      setResult(data);
      if (data.error) setStatus(data.error);
      else if (data.deliveries?.length) {
        const email = data.deliveries.find((item) => item.channel === "email");
        if (email?.ok) setStatus("Run complete — digest emailed.");
      }
    } catch {
      setStatus("Network error running Market Radar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    setStatus(null);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          operatorSummary,
          assumptions: linesToList(assumptions),
          principles: linesToList(principles),
          sources: parseSourceLines(sources),
          cadence: {
            label:
              cadenceFrequency === "weekly" ? "Weekly watch" : "Daily watch",
            frequency: cadenceFrequency,
            hourUtc: 7,
            dayOfWeekUtc: 1,
          },
          escalationPolicy: "threat_and_opportunity",
          sinceHours: 48,
          delivery: deliveryEmail.trim()
            ? { email: deliveryEmail.trim() }
            : {},
          ...(runToken.trim() ? { runToken: runToken.trim() } : {}),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (data.error) setStatus(data.error);
      else
        setStatus(
          "Monitor saved to durable storage. Cron uses Neon when POSTGRES_URL is set.",
        );
    } catch {
      setStatus("Failed to save monitor config.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSuggestSources() {
    setSuggesting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/sources/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorSummary,
          assumptions: linesToList(assumptions),
          principles: linesToList(principles),
          ...(runToken.trim() ? { runToken: runToken.trim() } : {}),
        }),
      });
      const data = (await response.json()) as {
        executableSources?: Array<{
          id: string;
          kind: string;
          url: string;
          label: string;
        }>;
        backlogRequests?: Array<{ kind: string; detail: string }>;
        error?: string;
      };
      if (data.error) {
        setStatus(data.error);
        return;
      }
      if (data.executableSources?.length) {
        setSuggestions(data.executableSources);
        setSources(
          data.executableSources
            .map((item) =>
              item.kind === "rss" ? item.url : `${item.kind} ${item.url}`,
            )
            .join("\n"),
        );
        const backlogNote =
          data.backlogRequests?.length ?
            ` ${data.backlogRequests.length} source(s) moved to backlog (not executable yet).`
          : "";
        setStatus(
          `Suggested ${data.executableSources.length} executable sources — review and save.${backlogNote}`,
        );
      }
    } catch {
      setStatus("Failed to suggest sources.");
    } finally {
      setSuggesting(false);
    }
  }

  const digest = result?.digest;
  const digestMarkdown = result?.digestMarkdown ?? digest?.digestMarkdown;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-xs uppercase tracking-[0.24em] text-[#8b5e34]">
        Market Radar Bestie · self-host v0.3.1
      </p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight">
        Your market-watch employee
      </h1>
      <p className="mt-3 text-[#5d5448]">
        Durable monitor config in Neon Postgres, modular source adapters, and
        email delivery receipts. Worldview-shaped reasoning via Vercel AI Gateway.
      </p>

      <section className="mt-8 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Operator summary</span>
          <textarea
            className="min-h-20 rounded border border-[var(--border)] bg-white/70 p-3"
            value={operatorSummary}
            onChange={(e) => setOperatorSummary(e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Assumptions (one per line)</span>
          <textarea
            className="min-h-24 rounded border border-[var(--border)] bg-white/70 p-3 font-mono text-sm"
            value={assumptions}
            onChange={(e) => setAssumptions(e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Principles / worldview (one per line)</span>
          <textarea
            className="min-h-24 rounded border border-[var(--border)] bg-white/70 p-3 font-mono text-sm"
            value={principles}
            onChange={(e) => setPrinciples(e.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">
            Source registry — one per line (`rss URL`, `website URL`, `sitemap URL`)
          </span>
          <textarea
            className="min-h-28 rounded border border-[var(--border)] bg-white/70 p-3 font-mono text-sm"
            value={sources}
            onChange={(e) => setSources(e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Cadence</span>
            <select
              className="rounded border border-[var(--border)] bg-white/70 p-3 text-sm"
              value={cadenceFrequency}
              onChange={(e) =>
                setCadenceFrequency(
                  e.target.value as "daily" | "weekly" | "manual",
                )
              }
            >
              <option value="daily">Daily at 07:00 UTC (fixed cron)</option>
              <option value="weekly">Weekly Monday 07:00 UTC (fixed cron)</option>
              <option value="manual">Manual only</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Digest email (Resend)</span>
            <input
              type="email"
              className="rounded border border-[var(--border)] bg-white/70 p-3 text-sm"
              value={deliveryEmail}
              onChange={(e) => setDeliveryEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-medium">
            Run token (required if MARKET_RADAR_RUN_TOKEN is set)
          </span>
          <input
            type="password"
            className="rounded border border-[var(--border)] bg-white/70 p-3 font-mono text-sm"
            value={runToken}
            onChange={(e) => setRunToken(e.target.value)}
            placeholder="Optional unless your deploy requires it"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="inline-flex border border-[#1f1b15] bg-[#1f1b15] px-5 py-3 text-xs uppercase tracking-[0.16em] text-[#fff8ea] disabled:opacity-60"
          >
            {loading ? "Running…" : "Run now"}
          </button>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="inline-flex border border-[#1f1b15]/30 bg-[#fff8ea] px-5 py-3 text-xs uppercase tracking-[0.16em] text-[#1f1b15] disabled:opacity-60"
          >
            {savingConfig ? "Saving…" : "Save monitor"}
          </button>
          <button
            type="button"
            onClick={handleSuggestSources}
            disabled={suggesting}
            className="inline-flex border border-[#1f1b15]/30 bg-white px-5 py-3 text-xs uppercase tracking-[0.16em] text-[#1f1b15] disabled:opacity-60"
          >
            {suggesting ? "Suggesting…" : "Suggest sources"}
          </button>
        </div>
      </section>

      {status ? (
        <p className="mt-6 rounded border border-[var(--border)] bg-white/60 p-4 text-sm">
          {status}
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <section className="mt-6 rounded border border-[var(--border)] bg-white/50 p-4 text-sm">
          <h2 className="font-medium">Suggested sources</h2>
          <ul className="mt-2 space-y-1">
            {suggestions.map((item) => (
              <li key={item.id}>
                [{item.kind}] {item.label} — {item.url}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {digest ? (
        <section className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 className="text-xl font-semibold">Latest digest</h2>
          <p className="mt-2 text-sm text-[#5d5448]">
            Dropped: {digest.droppedCount}
          </p>
          <div className="mt-6 grid gap-6">
            <div>
              <h3 className="font-medium">Escalations</h3>
              {digest.escalations.length === 0 ? (
                <p className="mt-2 text-sm text-[#5d5448]">None this run.</p>
              ) : (
                <ul className="mt-2 space-y-3 text-sm">
                  {digest.escalations.map((item) => (
                    <li key={`${item.observation.title}-${item.observation.url}`}>
                      <strong>[{item.impact.stance}]</strong> {item.observation.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-medium">Morning brief</h3>
              {digest.morningBrief.length === 0 ? (
                <p className="mt-2 text-sm text-[#5d5448]">No additional keepers.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {digest.morningBrief.map((item) => (
                    <li key={`brief-${item.observation.title}`}>
                      {item.observation.title} ({item.impact.stance})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {digestMarkdown ? (
        <section className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 className="text-xl font-semibold">Markdown digest</h2>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded border border-[var(--border)] bg-white/60 p-4 text-sm">
            {digestMarkdown}
          </pre>
        </section>
      ) : null}

      {catalog.length > 0 ? (
        <section className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 className="text-xl font-semibold">Source catalog</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {catalog.map((entry) => (
              <li key={entry.kind}>
                <strong>{entry.label}</strong> — {entry.availability.replaceAll("_", " ")}
                {entry.adapterReady ? " (adapter ready)" : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <aside className="mt-12 rounded border border-[var(--border)] bg-white/50 p-5 text-sm text-[#5d5448]">
        <p className="font-medium text-[#1f1b15]">Self-host vs managed</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Self-host v0.3:</strong> Neon persistence, source adapters, email receipts.
          </li>
          <li>
            <strong>Managed:</strong> governed watches, principle-at-risk, channels, graph memory.
          </li>
          <li>
            <strong>POSTGRES_URL</strong> required for production durability — not `/tmp`.
          </li>
        </ul>
        <a href={MANAGED_URL} className="mt-4 inline-block font-medium underline">
          Hire managed Market Radar →
        </a>
      </aside>
    </main>
  );
}
