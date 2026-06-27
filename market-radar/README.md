# Market Radar Bestie

So you're never the last to know.

Ephemeral market watch with **world-model-shaped reasoning** — each keeper links an observation to an
assumption and principle. No governed graph memory in the free/self-host paths.

> **Free has world-model thinking. Paid has world-model memory.**

---

## Three ways to hire this employee

### 1. Use in Claude / Codex *(source bundle)*

Copy `skills/market-radar/` into `.claude/skills/` or paste `SKILL.md` as Project instructions.
Write `operator.md` + `sources.yml`, run daily → local digest.

### 2. Deploy your own *(one-click web app)*

Deploy to **your Vercel** with **Vercel AI Gateway** — not a provider-specific key.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhirebestie%2Fagents&project-name=market-radar-bestie&root-directory=market-radar)

After deploy:
1. Add **Neon Postgres** via Vercel Marketplace — set `POSTGRES_URL` (required for durable persistence).
2. Enable **AI Gateway** on the project (OIDC auth) or set `AI_GATEWAY_API_KEY`.
3. Set `MARKET_RADAR_RUN_TOKEN`, `CRON_SECRET`, and optional `RESEND_API_KEY` for email digests.
4. Save monitor config in the UI → cron runs daily/weekly at 07:00 UTC.
5. Open the URL → run manually, suggest sources, or read the latest persisted digest.

**v0.3 persistence (Neon):**
- `monitor_configs`, `monitor_sources`, `monitor_runs`, `monitor_observations`, `monitor_digests`, `notification_deliveries`, `source_requests`
- Source adapters: `rss`, `website`, `sitemap` (modular registry; more via request backlog)
- Email delivery receipts via Resend (Slack/Telegram adapters backlog)

**Security (required for public deploy):**
- `MARKET_RADAR_RUN_TOKEN` gates `/api/run` and `/api/config`.
- `CRON_SECRET` gates `/api/cron/daily-radar`.
- Server-side fetch blocks localhost/private IPs; caps sources (20) and response size (1MB).
- Observations are hydrated server-side from fetched feeds — the model selects indices only.

- **Web channel first** — the deployed app is the product.
- Slack/Telegram env vars are optional placeholders (not wired one-click in v0).
- **WhatsApp is managed setup only** — not promised as self-serve.

### 3. Let HireBestie manage it

Always-on watches, principle-at-risk cadence, graph memory, routed actions, receipts, channels.

**[Hire managed Market Radar →](https://hirebestie.com/agents/market-radar?utm_source=ep03&utm_medium=deploy_readme&utm_campaign=market_radar_deploy)**

---

## Repo layout

```text
market-radar/
  README.md
  skills/
  schemas/
  examples/
  tools.ts
  connectors.ts
  deploy-config.ts
  package.json
  app/              # Next.js web UI (self-host)
  lib/
```

---

## Free vs managed

| Free / self-host | Managed Bestie |
|---|---|
| Lite assumptions + principles in Neon | Persisted deployment graph |
| Scheduled runs + persisted digests | Governed watches + principle-at-risk |
| Email delivery receipts | Slack/Telegram/WhatsApp + action loop |
| Modular source adapters | Full source registry + Exa/community |

---

## Honest boundaries

- Public sources only (RSS, public pages). No login-walled scraping.
- Filter, not oracle. Every keeper traces to a real URL.
- Flags; you act. This app never posts or decides for you.
- `principle_at_risk` cadence in `deploy-config.ts` is **managedOnly** — not available in free self-host.

---

Generated from `monorepo/packages/agent-templates`. Regenerate: `bun run export:market-radar:public`.
