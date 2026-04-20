type SendEmailInput = {
  to: string | null | undefined;
  subject: string;
  text: string;
  html?: string;
};

type SendEmailResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing_recipient" | "unconfigured" };

const resendApiUrl = "https://api.resend.com/emails";

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const to = input.to?.trim();
  if (!to) {
    return { status: "skipped", reason: "missing_recipient" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from) {
    console.info(
      `[notifications] Email skipped for ${to}: RESEND_API_KEY or NOTIFICATION_FROM_EMAIL is not configured.`,
    );
    return { status: "skipped", reason: "unconfigured" };
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? textToHtml(input.text),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Email delivery failed: ${response.status} ${detail || response.statusText}`,
    );
  }

  return { status: "sent" };
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
