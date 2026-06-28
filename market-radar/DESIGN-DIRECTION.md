# Market Radar Deployable — Design Direction

> **Status:** Implemented v1 — keep as design contract for future UI work.  
> **Audience:** Whoever extends UI on the standalone export (`HireBestie/agents/market-radar`).  
> **Bar:** A stranger understands what to do in 30 seconds without docs.

---

## Product frame

**The page should feel like:**

> Brief your new market-watching employee.

**Not like:**

> Configure a serverless app.

Design is part of credibility. If we claim “one-click hiring,” the interface must feel like someone already removed the friction. Users are **training Bestie**, not assembling plumbing.

**Canonical line:** *Free has world-model **thinking**. Paid has world-model **memory**.*

---

## The core constraint: standalone + on-brand

This app is **cloned to someone else's Vercel**. It cannot depend on the monorepo.

| Do | Don't |
|---|---|
| Vendor Marcou token **values** into this app's `globals.css` | Import `@repo/design-system` or `@repo/ui` |
| Copy in shadcn components (Button, Card, …) | Ship default gray shadcn |
| Load fonts via `next/font/google` | Add font packages |
| Hide Neon / Resend / Cron / Gateway in setup checklist + advanced drawer | Lead with infrastructure names in main flow |

**Stack for UI v1:** vendored Marcou tokens (skin) + copied-in shadcn primitives (bones) + `next/font` (Fraunces · Newsreader · DM Mono).

**Honest dependency cost of shadcn:** Tailwind + only the `@radix-ui` primitives you use + `cva` + `clsx` + `tailwind-merge` + `lucide-react`. Copy in **only** the components listed below.

---

## Brand source of truth

Canonical tokens live in `monorepo/packages/design-system/src/styles/globals.css`.  
Market Radar is the **consumer-facing front of the same war room** as Marcou/PMIA — not a warm coffee-shop spinoff.

Kill the current deployable palette (`--bg: #fff8ea`, `--accent: #c2693c`, `system-ui`). None of that is Marcou.

**Family resemblance:** Fraunces display + vivid gold primary — PMIA already uses Fraunces 900 for prices. Lead the hero with that pair and it reads as Bestie at a glance.

---

## Vendored token block (light mode — copy into `globals.css`)

Use these literal values. Map to shadcn semantic names where noted.

### Typography (via `next/font/google`)

```css
--font-display: "Fraunces", ui-serif, Georgia, serif;
--font-body: "Newsreader", ui-serif, Georgia, serif;
--font-data: "DM Mono", "Courier New", monospace;
```

### Structural neutrals + shadcn semantics

```css
--background: oklch(0.96 0.01 260);   /* brushed silver ground */
--foreground: oklch(0.15 0.02 260);   /* gunmetal ink */
--card: oklch(0.98 0.005 260);
--card-foreground: oklch(0.15 0.02 260);
--popover: oklch(0.99 0.002 260);
--popover-foreground: oklch(0.15 0.02 260);
--primary: oklch(0.72 0.18 75);     /* vivid gold — conviction only */
--primary-foreground: oklch(0.15 0.02 260);
--secondary: oklch(0.92 0.01 260);
--secondary-foreground: oklch(0.25 0.02 260);
--muted: oklch(0.94 0.01 240);
--muted-foreground: oklch(0.5 0.02 260);
--accent: oklch(0.95 0.02 240);
--accent-foreground: oklch(0.2 0.05 260);
--destructive: oklch(0.55 0.2 25);
--destructive-foreground: oklch(0.98 0 0);
--border: oklch(0.85 0.02 260);
--input: oklch(0.9 0.02 260);
--ring: oklch(0.72 0.18 75);
--radius: 1.25rem;
```

### Pitch / argument-chain tokens (digest rail)

These already exist as Marcou's central design atom. **Do not invent a new digest aesthetic.**

| Digest step | Token | Role | Light value |
|---|---|---|---|
| Source / evidence | `--pitch-exhibit` | gunmetal | `oklch(0.42 0.02 260)` |
| Signal (conviction) | `--pitch-claim` | gold | `oklch(0.62 0.16 75)` |
| Assumption touched | `--pitch-warrant` | steel blue | `oklch(0.45 0.12 230)` |
| Principle under stress | `--pitch-chain` | violet | `oklch(0.5 0.12 280)` |
| Risk / threat | `--pitch-rebuttal` | amber-orange | `oklch(0.56 0.15 55)` |

Include matching `-bg` and `-border` variants from design-system globals for chip backgrounds.

### Threat / status (never hardcode zinc/emerald/rose/amber)

```css
--arena-risk-high: oklch(0.55 0.2 25);
--arena-risk-medium: oklch(0.62 0.16 75);
--arena-risk-low: oklch(0.55 0.15 154);
--arena-yes: oklch(0.58 0.17 154);
--arena-no: oklch(0.58 0.2 25);
```

### Utility classes to vendor

```css
.font-display { font-family: var(--font-display); }
.font-body-serif { font-family: var(--font-body); }
.font-data { font-family: var(--font-data); }

.label-arena {
  font-family: var(--font-data);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--muted-foreground);
  line-height: 1;
}
```

---

## Signature motif: the argument chain

The differentiator is visible in every digest item:

```
Source → Signal → Assumption → Principle → Action
```

Map onto pitch tokens (compact **AssumptionPitchCard** rail, not a Google Alerts list):

```
[EXHIBIT] source title/url
    → [CLAIM] signal headline
    → [WARRANT] assumption touched
    → [CHAIN] principle under stress
    → [ACTION] recommended move
```

Threat escalations add `[REBUTTAL]` / `--arena-risk-*` when stance is adverse.

**The markdown digest is export, not hero.** Receipts, URLs, and tokens use `--font-data` (mono).

---

## Information architecture — four surfaces

Use **Tabs** or top-level nav. Never one scrolling form.

### 1. Welcome

Headline: *Your Market Radar Bestie is live.*

**Three path cards:**
- Use in Claude / Codex → skill repo link
- Deploy your own → Vercel clone button
- Hire managed → Marcou upsell

**Status checklist** (human labels, not vendor names):
- AI connected ✓/✗
- Memory connected ✓/✗
- Schedule active ✓/✗
- Email delivery configured ✓/✗

Technical names (Neon, AI Gateway, Cron, Resend) live only in tooltip or advanced drawer.

### 2. Train Bestie (wizard — primary onboarding)

Progressive disclosure. **Progress** bar across 6 steps.

| Step | Prompt | Help text |
|---|---|---|
| 1 Business context | What should Bestie understand about your business? | — |
| 2 Assumptions | What could change your market? | Write beliefs that would change a decision if they moved. |
| 3 Principles | How should Bestie decide what matters? | Principles are decision rules, not values posters. |
| 4 Sources | Where should Bestie look? | RSS · website · sitemap · suggest · request unsupported |
| 5 Cadence + delivery | Where should Bestie report? | Email first. Slack/Telegram/WhatsApp → “Available in managed” / “Request support” / “Coming soon” |
| 6 Test scan | Ask Bestie to scan now | Show crisp result; land user on Digest |

Each step: useful defaults, immediate validation, examples ready. **Sheet** or **Dialog** for add-source flows.

### 3. Watch Room

Operations surface, still editorial — not admin console.

- Monitor status badge
- Source list (executable vs backlog)
- Next run / last run
- Delivery status
- Source backlog requests

### 4. Digest

Visual centerpiece.

- Latest escalations (pitch-card rails)
- Morning brief
- Dropped count
- Email receipt state
- Markdown export secondary (**Accordion** or drawer)

---

## shadcn components — minimal set

Copy in **only** these:

- `Button` · `Card` · `Input` · `Textarea` · `Select`
- `Tabs` · `Badge` · `Alert` · `Separator`
- `Dialog` · `Sheet` · `Tooltip` · `Progress` · `Accordion`

**Later (if needed):** `Command` for source search.

**Skip:** data-table libraries, charting kits, animation packages, custom state machines, heavy dashboard kits.

---

## Marcou non-negotiables (avoid “default shadcn”)

1. **Depth via borders + contrast, not shadows.** `shadow-sm` is a SaaS tell. Exception: subtle full-card lift on light background.
2. **`--radius: 1.25rem` on cards; `rounded-sm` on sub-elements** — document-like, not bubbly.
3. **Gold is conviction only** — signal numbers, primary CTA, verdict. Never decoration.
4. **Section labels = `.label-arena`** — DM Mono 10px uppercase, 0.16em tracking.
5. **Never hardcode Tailwind zinc/emerald/rose/amber** — use arena/pitch tokens.
6. **Threat states** use `--arena-risk-high/medium/low`, not random reds.
7. **Copy:** never say “operator summary” in UI. Never show `POSTGRES_URL` in main flow. No YAML paste as primary input.

---

## Motion

- Tiny progress reveal in wizard step transitions
- Smooth digest item arrival (opacity + translate, restrained)
- No bouncing AI sparkle, no generic “thinking” animations

---

## Frictionless promise

Frictionless ≠ zero configuration. It means:

- Every field explains itself
- Examples are pre-filled where safe
- Validation is immediate
- Defaults are useful
- Unsupported capabilities become **requests**, not errors
- User always knows the next action

Target feeling: *I can do this.* Not: *I need to understand your architecture.*

---

## First implementation slice

**Replace** the single-page raw form (`app/page.tsx` + invented `globals.css`) with:

1. Tailwind + shadcn init (standalone, no monorepo deps)
2. Vendored Marcou tokens + `next/font` fonts
3. **Train Bestie** wizard (6 steps)
4. **Digest** dashboard with pitch-card rails
5. **Welcome** checklist + three paths (can ship in same PR or immediately after)

### Acceptance criteria

- [x] Stranger understands what to do in 30 seconds without reading README
- [x] Setup completable without docs (6-step wizard + auto-save)
- [x] Three paths (Claude · deploy · managed) are obvious
- [x] Digest visibly reads as an argument chain, not Google Alerts
- [x] App looks like Marcou's front door, not Vercel boilerplate
- [x] No `@repo/*` imports; export + `bun run build` passes
- [x] Infrastructure vendors hidden from primary copy

---

## Technical details — where they belong

| Surface | Content |
|---|---|
| Welcome checklist | Human-readable connection status |
| Advanced drawer / Sheet | Env var names, model override, cron token |
| Deployment diagnostics | POSTGRES_URL, gateway key hints, Resend sandbox note |

---

## Reference links (implementation)

| Resource | Path / URL |
|---|---|
| Canonical design tokens | `monorepo/packages/design-system/src/styles/globals.css` |
| Current deployable UI (replace) | `deployable/app/page.tsx`, `deployable/app/globals.css` |
| Public repo | https://github.com/HireBestie/agents/tree/main/market-radar |
| Production deploy | https://market-radar-bestie.vercel.app |
| Managed upsell | `https://hirebestie.com/deploy?agent=market-radar&utm_source=deploy_app` |

---

## What not to do (checklist)

- [ ] Don't invent a third palette (cream/clay is dead)
- [ ] Don't import internal monorepo packages
- [ ] Don't lead with Neon / AI Gateway / Cron / Resend
- [ ] Don't make markdown digest the hero
- [ ] Don't ship default shadcn gray
- [ ] Don't look like an admin console or serverless configurator

---

*Last updated: design direction v1 — UI implemented; aligned to Marcou/PMIA tokens, standalone export constraint.*
