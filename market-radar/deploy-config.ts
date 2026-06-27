/** @generated — do not edit. Run export:market-radar from @repo/agent-templates */
export const MARKET_RADAR_DEPLOY_CONFIG = {
  "repositoryUrl": "https://github.com/hirebestie/agents",
  "repositoryPath": "market-radar",
  "defaultChannels": [
    "web",
    "slack",
    "telegram"
  ],
  "defaultSchedules": [
    {
      "cadence": "daily",
      "label": "Daily watch",
      "defaultHourUtc": 7
    },
    {
      "cadence": "principle_at_risk",
      "label": "When a principle is at risk",
      "managedOnly": true
    }
  ],
  "env": [
    {
      "key": "POSTGRES_URL",
      "description": "Neon Postgres connection string — required for durable monitor persistence",
      "required": true
    },
    {
      "key": "AI_GATEWAY_API_KEY",
      "description": "Vercel AI Gateway key (optional on Vercel if OIDC is enabled)",
      "required": false
    },
    {
      "key": "MARKET_RADAR_MODEL",
      "description": "Gateway model slug (default google/gemini-3.1-flash-lite)",
      "required": false
    },
    {
      "key": "MARKET_RADAR_RUN_TOKEN",
      "description": "Strongly recommended — secret required to call /api/run and /api/config",
      "required": false
    },
    {
      "key": "CRON_SECRET",
      "description": "Required for Vercel Cron daily radar route",
      "required": false
    },
    {
      "key": "RESEND_API_KEY",
      "description": "Email delivery for digests (first durable channel)",
      "required": false
    },
    {
      "key": "MARKET_RADAR_FROM_EMAIL",
      "description": "Verified Resend from address for digest email",
      "required": false
    },
    {
      "key": "SLACK_BOT_TOKEN",
      "description": "Optional Slack delivery (channel adapter backlog)",
      "required": false
    },
    {
      "key": "TELEGRAM_BOT_TOKEN",
      "description": "Optional Telegram delivery (channel adapter backlog)",
      "required": false
    }
  ],
  "cloneUrl": "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhirebestie%2Fagents&project-name=market-radar-bestie&root-directory=market-radar&env=POSTGRES_URL&envDescription.POSTGRES_URL=Neon+Postgres+connection+string+%E2%80%94+required+for+durable+monitor+persistence&envRequired.POSTGRES_URL=1&env=AI_GATEWAY_API_KEY&envDescription.AI_GATEWAY_API_KEY=Vercel+AI+Gateway+key+%28optional+on+Vercel+if+OIDC+is+enabled%29&env=MARKET_RADAR_MODEL&envDescription.MARKET_RADAR_MODEL=Gateway+model+slug+%28default+google%2Fgemini-3.1-flash-lite%29&env=MARKET_RADAR_RUN_TOKEN&envDescription.MARKET_RADAR_RUN_TOKEN=Strongly+recommended+%E2%80%94+secret+required+to+call+%2Fapi%2Frun+and+%2Fapi%2Fconfig&env=CRON_SECRET&envDescription.CRON_SECRET=Required+for+Vercel+Cron+daily+radar+route&env=RESEND_API_KEY&envDescription.RESEND_API_KEY=Email+delivery+for+digests+%28first+durable+channel%29&env=MARKET_RADAR_FROM_EMAIL&envDescription.MARKET_RADAR_FROM_EMAIL=Verified+Resend+from+address+for+digest+email&env=SLACK_BOT_TOKEN&envDescription.SLACK_BOT_TOKEN=Optional+Slack+delivery+%28channel+adapter+backlog%29&env=TELEGRAM_BOT_TOKEN&envDescription.TELEGRAM_BOT_TOKEN=Optional+Telegram+delivery+%28channel+adapter+backlog%29",
  "whatsAppNote": "WhatsApp requires managed Bestie setup — not available one-click."
} as const;
