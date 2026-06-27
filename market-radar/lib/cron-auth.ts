export function verifyCronSecret(request: Request): void {
  const required = process.env.CRON_SECRET?.trim();
  if (!required) {
    throw new Error(
      "CRON_SECRET is not configured. Set it in Vercel env to enable scheduled runs.",
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${required}`) {
    throw new Error("Unauthorized cron invocation.");
  }
}
