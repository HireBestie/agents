export const MANAGED_URL =
  "https://hirebestie.com/deploy?agent=market-radar&utm_source=deploy_app&utm_medium=upsell&utm_campaign=market_radar_deploy";

export const DEPLOY_YOUR_OWN_URL =
  "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhirebestie%2Fagents&project-name=market-radar-bestie&root-directory=market-radar&integration-ids=neon";

export const FREE_SKILL_URL =
  "https://github.com/hirebestie/agents/tree/main/market-radar/skills/market-radar";

export const WIZARD_STEPS = [
  { id: 1, title: "Business context", prompt: "What should Bestie understand about your business?" },
  { id: 2, title: "Assumptions", prompt: "What could change your market?" },
  { id: 3, title: "Principles", prompt: "How should Bestie decide what matters?" },
  { id: 4, title: "Sources", prompt: "Where should Bestie look?" },
  { id: 5, title: "Reporting", prompt: "Where should Bestie report?" },
  { id: 6, title: "Test scan", prompt: "Ask Bestie to scan now" },
] as const;

export const DEFAULT_BUSINESS =
  "Regional HVAC installer serving residential retrofits in the US Midwest. Competes on installed price and financing terms.";

export const DEFAULT_ASSUMPTIONS = [
  "Financing terms decide our quote win rate this quarter",
  "Copper input costs stay flat through Q3",
  "Local competitor A will not expand service territory before fall",
];

export const DEFAULT_PRINCIPLES = [
  "Compete on total cost of ownership, not sticker price",
  "Act on confirmed local competitor moves within 48 hours",
  "Do not chase commodity noise without a local mechanism",
];

export const DEFAULT_SOURCES = [
  {
    id: "default-rss",
    kind: "rss" as const,
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    label: "Public news probe feed",
    status: "active" as const,
  },
];
