import type { MarketRadarDigestOutput } from "../digest";
import type { MarketRadarMonitorConfig } from "../monitor-config";
import { sendDigestEmail } from "./email";

export async function deliverDigest(input: {
  digest: MarketRadarDigestOutput;
  digestId?: string;
  config?: MarketRadarMonitorConfig | null;
}): Promise<{ channel: string; ok: boolean; error?: string }[]> {
  const receipts: { channel: string; ok: boolean; error?: string }[] = [];
  const email = input.config?.delivery?.email?.trim();

  if (!email) {
    return receipts;
  }

  const date = input.digest.generatedAt.slice(0, 10);
  const result = await sendDigestEmail({
    digestId: input.digestId,
    to: email,
    subject: `Market Radar digest - ${date}`,
    markdown: input.digest.digestMarkdown,
  });
  receipts.push({
    channel: "email",
    ok: result.ok,
    error: result.error,
  });

  return receipts;
}
