# Dependency Rationale — Market Radar Deployable

This app is **standalone**: it exports to `HireBestie/agents/market-radar` and deploys to someone else's Vercel. It cannot import `@repo/*` packages from the HireBestie monorepo.

## Package manager: Bun

- **Bun** matches HireBestie's monorepo standard (Bun + Turbo internally).
- **Vercel** installs with `bun install --frozen-lockfile` and builds with `bun run build` (see `vercel.json`).
- **One lockfile:** `bun.lock` only. No `pnpm-lock.yaml` or `package-lock.json`.
- **`packageManager`** field pins `bun@1.3.10` for reproducible installs.

Local dev:

```bash
bun install
bun run dev
```

## Why shadcn (copied in, not installed as a framework)

We vendor shadcn **primitives** for:

- Accessible form controls, dialogs, tabs, sheets
- Validation-friendly inputs
- A familiar component API for contributors

We do **not** ship default gray shadcn chrome. Marcou tokens in `globals.css` provide the skin. See `DESIGN-DIRECTION.md`.

## Runtime dependencies (minimal set)

| Package | Role |
|---|---|
| `@radix-ui/react-*` | Headless primitives for shadcn components we actually use |
| `class-variance-authority` | Button/badge variants |
| `clsx` + `tailwind-merge` | `cn()` helper |
| `lucide-react` | Icons (tree-shaken per import) |
| `tailwindcss` + `@tailwindcss/postcss` | Tailwind v4 styling |
| `next`, `react`, `react-dom` | App framework |
| `@neondatabase/serverless`, `ai`, `zod` | Monitor backend (unchanged from v0.3) |

We intentionally skip: data-table libraries, chart kits, animation packages, dashboard kits.

## Why no monorepo imports

A user clones `HireBestie/agents` to **their** Vercel account. They do not have access to `@repo/design-system` or `@repo/ui`. Brand tokens are **vendored as CSS values** in `globals.css`; fonts load via `next/font/google`.

## Verify from monorepo

```bash
cd monorepo/packages/agent-templates
bun run verify:market-radar-deployable   # typecheck + build source template
bun run export:market-radar:public       # regenerate staging public repo
```

CI runs the same Bun isolation build on every export.
