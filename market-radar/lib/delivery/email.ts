import { recordNotificationDelivery } from "../db/monitor-store";

export async function sendDigestEmail(input: {
  digestId?: string;
  to: string;
  subject: string;
  markdown: string;
}): Promise<{ ok: boolean; providerMessageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.MARKET_RADAR_FROM_EMAIL?.trim() ??
    "Market Radar <onboarding@resend.dev>";

  if (!apiKey) {
    const error = "RESEND_API_KEY is not configured.";
    if (input.digestId) {
      await recordNotificationDelivery({
        digestId: input.digestId,
        channel: "email",
        target: input.to,
        status: "skipped",
        error,
      });
    }
    return { ok: false, error };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.markdown,
      }),
    });

    const payload = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) {
      const error = payload.message ?? `Resend HTTP ${response.status}`;
      if (input.digestId) {
        await recordNotificationDelivery({
          digestId: input.digestId,
          channel: "email",
          target: input.to,
          status: "failed",
          error,
        });
      }
      return { ok: false, error };
    }

    if (input.digestId) {
      await recordNotificationDelivery({
        digestId: input.digestId,
        channel: "email",
        target: input.to,
        status: "sent",
        providerMessageId: payload.id,
      });
    }

    return { ok: true, providerMessageId: payload.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    if (input.digestId) {
      await recordNotificationDelivery({
        digestId: input.digestId,
        channel: "email",
        target: input.to,
        status: "failed",
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}
