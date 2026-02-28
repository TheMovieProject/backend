import { buildAbsoluteUrl, sendEmail } from "@/app/libs/mailer";

type EmailRecipient = {
  email: string;
  name?: string | null;
};

function safeName(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "there";
}

export async function sendVerificationEmail(
  recipient: EmailRecipient,
  token: string
): Promise<void> {
  const verifyUrl = buildAbsoluteUrl(
    `/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
      recipient.email
    )}`
  );

  const text = [
    `Hi ${safeName(recipient.name)},`,
    "",
    "Please verify your email address to activate your account.",
    verifyUrl,
    "",
    "This link expires in 60 minutes.",
    "If you did not create this account, please ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${safeName(recipient.name)},</p>
    <p>Please verify your email address to activate your account.</p>
    <p><a href="${verifyUrl}">Verify email</a></p>
    <p>This link expires in 60 minutes.</p>
    <p>If you did not create this account, please ignore this email.</p>
  `;

  await sendEmail({
    to: recipient.email,
    subject: "Verify your email",
    text,
    html,
  });
}

export async function sendPasswordResetEmail(
  recipient: EmailRecipient,
  token: string
): Promise<void> {
  const resetUrl = buildAbsoluteUrl(
    `/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
      recipient.email
    )}`
  );

  const text = [
    `Hi ${safeName(recipient.name)},`,
    "",
    "We received a request to reset your password.",
    resetUrl,
    "",
    "This link expires in 30 minutes and can be used only once.",
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${safeName(recipient.name)},</p>
    <p>We received a request to reset your password.</p>
    <p><a href="${resetUrl}">Reset password</a></p>
    <p>This link expires in 30 minutes and can be used only once.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;

  await sendEmail({
    to: recipient.email,
    subject: "Reset your password",
    text,
    html,
  });
}
