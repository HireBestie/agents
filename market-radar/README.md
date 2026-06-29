# Market Radar Bestie

So you are never the last to know.

Market Radar watches **public sources** through your **watch targets** and
**escalation rules**, then sends a short **digest** of **signals** that deserve
**action**.

> Free has world-model thinking. Managed Bestie has world-model memory.

**Choose your journey:** [hirebestie.com/agents/market-radar](https://hirebestie.com/agents/market-radar)

---

## 1. Use the brain — Claude / Codex

**Best for:** running Market Radar today with no infrastructure.

**Start here:**

1. Open [`skills/market-radar/SKILL.md`](skills/market-radar/SKILL.md) — self-contained instructions.
2. Or paste [`examples/minimal.md`](examples/minimal.md) into chat (60-second path).
3. For a reusable plan, copy [`examples/operator.md`](examples/operator.md) and [`examples/sources.yml`](examples/sources.yml).

**Copy-paste prompt** (also inside `SKILL.md`):

```text
You are my Market Radar Bestie. Run the market-radar skill.
Interview me if needed, compile watch targets + escalation rules + sources,
then run today's radar and write brief-YYYY-MM-DD.md.
```

**Install today:**

```bash
git clone https://github.com/hirebestie/agents
# Open: market-radar/skills/market-radar/SKILL.md
```

**Coming soon:** `npx skills install` / skills.sh one-click. Not live yet — use git clone.

**Skill cannot:** remember tomorrow, run on a schedule, send email, or persist graph memory. See "Honest boundaries" in `SKILL.md`.

---

## 2. Own the app — Deploy to Vercel

**Best for:** web app, durable memory, daily cron, web digest (email optional).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhirebestie%2Fagents&project-name=market-radar-bestie&root-directory=market-radar)

**Live demo:** [market-radar-bestie.vercel.app](https://market-radar-bestie.vercel.app)

After deploy:

1. Connect AI, memory, schedule (email optional).
2. **Brief Bestie** — tool-loop interview.
3. Approve watch plan → first scan → Digest / Watch room.

Uses Vercel AI Gateway, Neon Postgres, Vercel Cron, optional Resend.  
Bun: `bun install --frozen-lockfile && bun run build`. See `DEPENDENCY-RATIONALE.md`.

Source adapters: `rss`, `website`, `sitemap`.

---

## 3. Hire the employee — Managed Bestie

**Best for:** graph memory, channels, governance, operator support.

[Hire managed Market Radar](https://hirebestie.com/deploy?agent=market-radar&utm_source=agents_readme&utm_medium=managed_cta&utm_campaign=market_radar)

Managed adds: persistent graph, scheduled watches, Slack/Telegram/WhatsApp,
action receipts, source expansion. Import your self-host seed — no cold start.

---

## What's in this repo

| Path | Purpose |
|---|---|
| `skills/market-radar/SKILL.md` | Agent brain — start here for Claude/Codex |
| `examples/minimal.md` | Shortest copy-paste path |
| `examples/operator.md` | Watch plan template |
| `examples/sources.yml` | Public sources template |
| `examples/worked-run.md` | Illustrative digest |
| `schemas/*.json` | Structured output contracts |
| `skills/market-radar/rules/relevance-rubric.md` | Keep/drop tuning |

---

## Vocabulary (30 seconds)

| Term | Meaning |
|---|---|
| Watch target | Falsifiable belief that would change a decision |
| Escalation rule | When to interrupt vs. quiet brief |
| Source | Named public URL or feed |
| Signal | One observation that touches a watch target |
| Digest | Escalations + morning brief + dropped count |
| Action | brief, investigate, simulate, snooze, ignore |

---

## Honest boundaries

- Public sources only — no login-walled scraping.
- Every keeper traces to a real URL — no fabrication.
- Skill runs are ephemeral — no memory between sessions unless you use files.
- Deployed app: web digest works without email; email is progressive setup.
- Flags and recommends — does not act on your behalf.

---

Generated from `monorepo/packages/agent-templates`. Storefront: [hirebestie.com/agents/market-radar](https://hirebestie.com/agents/market-radar).
