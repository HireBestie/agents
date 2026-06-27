export function assertGatewayAuth(): void {
  const hasOidc = Boolean(process.env.VERCEL_OIDC_TOKEN?.trim());
  const hasGatewayKey = Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
  if (!hasOidc && !hasGatewayKey) {
    throw new Error(
      "AI Gateway auth required. Enable AI Gateway on your Vercel project (OIDC) or set AI_GATEWAY_API_KEY.",
    );
  }
}

export function resolveMarketRadarModel(): string {
  const configured = process.env.MARKET_RADAR_MODEL?.trim();
  if (configured && !configured.includes("/")) {
    throw new Error(
      `MARKET_RADAR_MODEL must use provider/model format (e.g. google/gemini-3.1-flash-lite). Got: ${configured}`,
    );
  }
  return configured || "google/gemini-3.1-flash-lite";
}
