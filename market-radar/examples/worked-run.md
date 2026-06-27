# Market Radar — worked run (illustrative)

This example is **labeled illustrative**. Sources and URLs are representative of the shape, not live fetches.

## Lite world model

```yaml
operator_summary: Regional HVAC installer, Midwest US, residential retrofits.
assumptions:
  - "Financing terms decide our quote win rate this quarter"
  - "Copper input costs stay flat through Q3"
principles:
  - "Compete on total cost of ownership, not sticker price"
  - "Act on confirmed local competitor moves, not national banner ads"
```

## Keeper item

```yaml
observation:
  source: trade_press_example
  title: "Regional competitor launches 0% financing banner"
  summary: "A direct competitor advertised 0% financing for installs in our metro."
  url: https://example.com/competitor-financing
  publishedAt: "2026-05-20T10:00:00.000Z"

impact:
  assumption: "Financing terms decide our quote win rate this quarter"
  relation: activates
  stance: threat
  mechanism: Financing reframes our same-unit quote as more expensive at decision time.
  confidence: 0.72
  affectedPrinciples:
    - "Compete on total cost of ownership, not sticker price"
  evidence: Public homepage banner; two installers already match in trade forum chatter.
  warrant: Financing objections are our top stated lost-deal reason.
  rebuttal: Single-market signal; finance partner may not serve our geography yet.

recommendation:
  action: investigate
  rationale: Confirm our supplier finance program before next week's quotes.
```

## Digest excerpt

```markdown
# Market Radar — 2026-05-21

## Escalations
- [THREAT] Regional competitor launches 0% financing banner
  Assumption: Financing terms decide our quote win rate this quarter
  Principle: Compete on total cost of ownership, not sticker price
  Action: investigate — Confirm our supplier finance program before next week's quotes.
  Source: https://example.com/competitor-financing

## Dropped
38 items off-sector / off-geography / already-known.
```
