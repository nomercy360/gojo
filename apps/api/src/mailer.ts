import nodemailer from "nodemailer";
import { env } from "./env.ts";

// Provider-agnostic SMTP (nodemailer) — works against local Mailpit in dev
// and any real SMTP provider in prod, so swapping providers is just an env
// change, not a code change.
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  // nodemailer's default connection timeout is ~120s — if the SMTP host is
  // unreachable (e.g. the provider blocks outbound SMTP ports on this VM),
  // that hangs the calling request for 2 minutes before the caller's
  // try/catch even gets a chance to run. Fail fast instead.
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 5_000,
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
}
