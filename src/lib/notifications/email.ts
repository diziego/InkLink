type SendEmailInput = {
  to: string | null | undefined;
  subject: string;
  text: string;
  html?: string;
};

type TransactionalEmailSection = {
  title: string;
  lines: string[];
};

type TransactionalEmailInput = {
  eyebrow?: string;
  heading: string;
  intro: string;
  sections?: TransactionalEmailSection[];
  cta?: {
    label: string;
    url: string;
  };
  footer?: string;
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

export function renderTransactionalEmail(input: TransactionalEmailInput) {
  const text = [
    "PrintPair",
    input.eyebrow,
    "",
    input.heading,
    "",
    input.intro,
    "",
    ...(input.sections ?? []).flatMap((section) => [
      section.title,
      ...section.lines.map((line) => `- ${line}`),
      "",
    ]),
    input.cta ? `${input.cta.label}: ${input.cta.url}` : null,
    input.cta ? "" : null,
    input.footer ??
      "This transactional email was sent by PrintPair for your order.",
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");

  const html = [
    '<div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;border-collapse:collapse;">',
    '<tr><td style="padding:0 0 12px 0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#312e81;">PrintPair</td></tr>',
    '<tr><td style="border:1px solid #e4e4e7;border-radius:12px;background:#ffffff;padding:28px;">',
    input.eyebrow
      ? `<p style="margin:0 0 10px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">${escapeHtml(input.eyebrow)}</p>`
      : "",
    `<h1 style="margin:0;font-size:24px;line-height:1.25;color:#18181b;">${escapeHtml(input.heading)}</h1>`,
    `<p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(input.intro)}</p>`,
    ...(input.sections ?? []).map((section) => renderHtmlSection(section)),
    input.cta
      ? `<p style="margin:26px 0 0 0;"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;border-radius:8px;background:#1e1b4b;padding:12px 18px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(input.cta.label)}</a></p>`
      : "",
    "</td></tr>",
    `<tr><td style="padding:14px 4px 0 4px;font-size:12px;line-height:1.5;color:#71717a;">${escapeHtml(
      input.footer ??
        "This transactional email was sent by PrintPair for your order.",
    )}</td></tr>`,
    "</table>",
    "</div>",
  ].join("");

  return { text, html };
}

function renderHtmlSection(section: TransactionalEmailSection) {
  return [
    '<div style="margin-top:22px;border:1px solid #e4e4e7;border-radius:10px;background:#fafafa;padding:16px;">',
    `<p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#18181b;">${escapeHtml(section.title)}</p>`,
    ...section.lines.map(
      (line) =>
        `<p style="margin:6px 0 0 0;font-size:14px;line-height:1.5;color:#52525b;">${escapeHtml(line)}</p>`,
    ),
    "</div>",
  ].join("");
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
