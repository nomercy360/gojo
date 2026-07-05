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
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
}
