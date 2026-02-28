type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const DEFAULT_APP_ORIGIN = "http://localhost:3000";
const EMAIL_REQUEST_TIMEOUT_MS = 5000;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EMAIL_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
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
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Email delivery timed out after ${EMAIL_REQUEST_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Email delivery failed (${response.status}): ${details}`);
  }
}
