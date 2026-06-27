/** @generated — do not edit. Run export:market-radar from @repo/agent-templates */
export const MARKET_RADAR_CONNECTOR_PLACEHOLDERS = [
  {
    "name": "web_fetch",
    "scopes": [
      "public_http_get"
    ],
    "notes": "Public RSS/pages only. No login-walled scraping."
  },
  {
    "name": "slack",
    "scopes": [
      "chat:write",
      "channels:read"
    ],
    "optional": true
  },
  {
    "name": "telegram",
    "scopes": [
      "bot:sendMessage"
    ],
    "optional": true
  }
] as const;
