/** Optional gate — strongly recommended for public Vercel deploys. */
export function verifyRunToken(provided: unknown): void {
  const required = process.env.MARKET_RADAR_RUN_TOKEN?.trim();
  if (!required) return;
  if (typeof provided !== "string" || provided !== required) {
    throw new Error(
      "Invalid or missing run token. Set MARKET_RADAR_RUN_TOKEN in your deployment env and pass the same value from the form.",
    );
  }
}

export function isRunTokenConfigured(): boolean {
  return Boolean(process.env.MARKET_RADAR_RUN_TOKEN?.trim());
}
