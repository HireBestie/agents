# Market Radar Operator Context

Use this file if you want a reusable local context for Claude, Codex, or another
agent. If you do not want files, paste these fields directly into chat.

## Operator Summary

Regional HVAC installer serving residential retrofit customers in the US
Midwest. Competes against two regional chains on installed price, financing
terms, response time, and trust.

## Watch targets

Watch targets are future-facing, falsifiable beliefs that would change a decision
if they moved. (Same idea as "assumptions" in the deployed app.)

- Financing terms decide our quote win rate this quarter.
- A local competitor opening nearby would pressure our service territory.
- Copper input costs stay flat through Q3.
- New rebate or efficiency rules could shift customer demand before winter.

## Escalation rules

Escalation rules are decision rules. They tell Bestie when to interrupt you vs.
put something in the quiet morning brief. (Same idea as "principles" in the app.)

- Act on confirmed local competitor moves within 48 hours.
- Compete on total cost of ownership, not sticker price.
- Do not escalate national news without a local mechanism.
- Prioritize margin risk over vanity growth signals.

## Escalation policy

Escalate when a **signal** creates a credible threat, opportunity, or mixed read
against a watch target. Put lower-certainty or context-only items in the morning
brief. Everything else is dropped or marked `watch_only`.

