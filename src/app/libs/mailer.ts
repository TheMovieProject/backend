type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const DEFAULT_APP_ORIGIN = "http://localhost:3000";

function getAppOrigin(): string {
  const origin = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? DEFAULT_APP_ORIGIN;
  return origin.endsWith("/") ? origin : `${origin}/`;
}

export function buildAbsoluteUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, getAppOrigin()).toString();
}

function previewLog(payload: EmailPayload): void {
  console.info("[auth-email-preview]", {
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!resendApiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      previewLog(payload);
      return;
    }
    throw new Error("Email provider is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Email delivery failed (${response.status}): ${details}`);
  }
}
