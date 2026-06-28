# Market Radar Bestie

So you are never the last to know.

Market Radar is a small AI employee that reads public market sources through
your assumptions and principles, then sends a short digest of what matters.

> Free has world-model thinking. Managed Bestie has world-model memory.

## Choose Your Path

### 1. Use in Claude or Codex

Use this when you want the agent logic, not infrastructure.

What you get:

- `skills/market-radar/SKILL.md`: self-contained instructions
- `examples/operator.md`: business, assumptions, principles
- `examples/sources.yml`: public source template
- `examples/worked-run.md`: example output
- `schemas/`: structured output contracts

How to use:

1. Copy `skills/market-radar/SKILL.md` into your AI tool as project
   instructions.
2. Fill `examples/operator.md` with your business context.
3. Fill `examples/sources.yml` with public sources.
4. Ask: "Run Market Radar for today and produce the digest."

No Neon, no Vercel, no Resend. This is the manual free path.

### 2. Deploy Your Own

Use this when you want a self-hosted web app with durable memory.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhirebestie%2Fagents&project-name=market-radar-bestie&root-directory=market-radar)

The deployed app uses:

- Vercel AI Gateway for model access
- Neon Postgres for durable monitor memory
- Vercel Cron for scheduled checks
- Resend for email digests

Required production setup:

1. Add Neon Postgres and set `POSTGRES_URL`.
2. Enable Vercel AI Gateway or set `AI_GATEWAY_API_KEY`.
3. Set `MARKET_RADAR_RUN_TOKEN`.
4. Set `CRON_SECRET`.
5. Optional: set `RESEND_API_KEY` and `MARKET_RADAR_FROM_EMAIL`.

Vercel installs with **Bun** (`bun install --frozen-lockfile`) and builds with
`bun run build`. Local dev: `bun install && bun run dev`. See
`DEPENDENCY-RATIONALE.md` for why shadcn primitives are vendored and why there
are no `@repo/*` imports.

Source adapters available now:

- `rss`
- `website`
- `sitemap`

Unsupported source types become backlog requests instead of pretending to work.

### 3. Hire Managed Bestie

Use this when you want us to run the employee for you.

Managed Bestie adds:

- governed assumptions and principles
- graph memory
- source expansion
- Slack, Telegram, WhatsApp, and email setup
- action receipts
- Brief, Investigate, Simulate, and Snooze loops

[Hire managed Market Radar](https://hirebestie.com/agents/market-radar?utm_source=ep03&utm_medium=deploy_readme&utm_campaign=market_radar_deploy)

## What Is An Assumption?

An assumption is a future-facing, falsifiable belief that would change a
decision if it moved.

Good:

- "A regional competitor will open within 20 miles before Q4."
- "Financing terms will matter more than headline price this quarter."

Weak:

- "The market is competitive."
- "Customers care about quality."

## What Is A Principle?

A principle is a decision rule. It tells Bestie how to decide what matters.

Good:

- "Act on confirmed local competitor moves within 48 hours."
- "Do not escalate national news unless it changes local demand or pricing."

Weak:

- "Be smart."
- "Watch competitors."

## Honest Boundaries

- Public sources only.
- No login-walled scraping.
- Every keeper must trace to a real URL.
- The self-host app sends email first; Slack, Telegram, and WhatsApp are managed
  or later adapters.
- The free skill does not remember prior runs.

Generated from `monorepo/packages/agent-templates`.

