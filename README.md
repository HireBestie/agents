# hirebestie/agents

Public Bestie agent bundles — one-click deployable employees derived from the Bestie monorepo.

> **Free has world-model thinking. Paid has world-model memory.**

## Agents

| Agent | Directory | Deploy |
|---|---|---|
| Market Radar | [`market-radar/`](./market-radar/) | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhirebestie%2Fagents&project-name=market-radar-bestie&root-directory=market-radar) |

## Regenerate from monorepo

```bash
cd monorepo/packages/agent-templates
bun run export:market-radar:public
bun run validate:market-radar-public
```

Push this repo after export. Do not edit generated files in `market-radar/` by hand.
