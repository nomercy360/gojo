import nodemailer from "nodemailer";
import { env } from "./env.ts";

// Prod sends through the Resend HTTP API (port 443) because the VM's outbound
// SMTP ports are blocked. Dev (no RESEND_API_KEY) falls back to nodemailer
// against local Mailpit, so the SMTP path stays exercised locally.
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  // Fail fast if the SMTP host is unreachable instead of hanging the request
  // for nodemailer's ~120s default.
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 5_000,
});

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.SMTP_FROM, to: [to], subject, html }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`resend send failed ${res.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html);
    return;
  }
  await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
}
