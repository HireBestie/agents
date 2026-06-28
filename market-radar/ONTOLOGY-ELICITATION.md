# Ontology Elicitation — Market Radar

> **Principle:** Ask in the user's language. Persist in Bestie's language.

Atomic agents are not separate products with separate ontologies. They are **elicitation interfaces** that translate pain-language into Bestie's ontology.

## User pain language (Reddit / operator evidence)

- "I find out too late"
- "Google Alerts is noise"
- "Nobody owns monitoring"
- "We saw it but did not act"
- "RFP/RFQ window closed"
- "Competitor move missed"

## Compiled Bestie objects

| Object | Role |
|---|---|
| **Assumptions** | Falsifiable beliefs that would change a decision if they moved |
| **Principles** | Decision rules for escalation (worldview seed) |
| **Sources** | Where evidence may appear |
| **Monitors** | What to watch, on what cadence, tied to assumptions |
| **Delivery destinations** | Where digests land |
| **Signals / actions** | Runtime outputs (digest items, recommended moves) |

## What is NOT a model primitive

**Business context** is valid elicitation input. It must not persist as world-model truth.

Allowed:

```ts
elicitationContext: {
  summary?: string;  // derived narrative, not the ontology
  answers: [{ questionId, answer, mappedPainIds }];
}
```

Not allowed as persisted truth:

```ts
operatorSummary  // legacy v1 only — migrate to elicitationContext.summary
```

## Compiler flow

```text
pain-language chat (AI SDK 7)
  → POST /api/chat (single turn)
  → model calls updateInterviewState tool (forced on step 0 via prepareStep)
  → MarketRadarInterviewState (missing | partial | complete | skipped per slot)
  → model streams follow-up text using active slot + nextQuestion
  → optional readyToCompile terminal tool when canCompile
  → when readyToCompile and canCompile → POST /api/elicit/compile
  → BestieSeedV1 (draft IDs) + PainCoverageAssessmentV1 + sourceBacklog
  → user reviews / edits
  → POST /api/config { bestieSeed, confirm: true }
  → confirmBestieSeed() — stable IDs + confirmedAt + seedRevision
  → bestieSeedToMonitorConfig(seed)  // runtime flatten (legacy projection)
  → existing scan/digest pipeline
```

Interview slots (`pain`, `escalation`, `manualChecks`, `sources`, `delivery`, `actionPolicy`) are evaluated structurally after every answer via the `updateInterviewState` tool inside `/api/chat`. Vague replies stay `partial` with explicit `missing[]` clarifications. Compile unlocks only when required slots are `complete` or `skipped` **and** Bestie calls the terminal `readyToCompile` tool — the UI trusts tool output and message metadata, not assistant prose.

## Seed authority (v0.5.1+)

**If `bestie_seed` exists in persistence, it is authoritative.**

Legacy columns (`operator_summary`, `assumptions`, `principles`) and `monitor_sources` rows are a **runtime projection** produced by `bestieSeedToMonitorConfig()`. They must never be edited independently.

| Rule | Enforcement |
|---|---|
| Reads are seed-first | `readAuthoritativeMonitorBundle()` → `resolveAuthoritativeMonitorBundle()` |
| Writes project atomically | `writeBestieSeedToDb()` writes seed + flattened columns in one transaction |
| Legacy POST blocked when seed exists | `POST /api/config` with flat config returns 409 |
| No generic source fallback | Compiler may return zero sources; user must approve backlog |
| Confirm stabilizes IDs | `confirmBestieSeed()` hashes statement/URL keys — safe for export/import |
| Run requires relevant sources | `validateSeedForRun()` rejects empty or probe-only feeds |

Draft compile uses `newDraftSeedId()`; confirmed seeds use `stableSeedId()` derived from normalized content.

## Managed upgrade

Confirmed `BestieSeedV1` exports for Marcou import — assumptions, principles, sources, monitors, and elicitation context carry forward. No blank slate.

## Coverage honesty

The app displays **none / partial / total** coverage per audience pain. **`total` requires relevant sources for that pain** — generic probe feeds (e.g. BBC News RSS) do not count.

Weakness is trust-building, not a bug to hide. Missing capabilities become `coverage_requests` roadmap signal.

For the open-core agent, the coverage panel is also the product feedback loop:

- **covered** means the self-host core can handle the pain with the current seed
- **partial** means the method works, but source/channel/follow-up coverage is incomplete
- **not yet** means the pain is visible but requires a new adapter, channel, parser, or managed capability

Users can request or upvote each missing capability. Repeated requests aggregate through
`request_count` so the project can prioritize source adapters, delivery channels, and
managed features by real operator demand.

See `lib/pain-coverage.ts` for the catalog and `lib/ontology-seed.ts` for schema + adapters.
