/** @generated — do not edit. Run export:market-radar from @repo/agent-templates */
export const MARKET_RADAR_TOOL_DEFINITIONS = [
  {
    "name": "search_sources",
    "description": "Fetch public RSS/pages/search results from the operator's configured source list.",
    "public": true
  },
  {
    "name": "interpret_observation",
    "description": "Score one observation against the lite world model (assumptions + principles) and emit impact + recommendation.",
    "public": true
  },
  {
    "name": "compose_digest",
    "description": "Assemble escalations + morning brief from interpreted items; write local digest output.",
    "public": true
  }
] as const;
