/**
 * Register (or delete) the Telegram bot webhook.
 *
 *   bun run tg:webhook              # auto-detect ngrok, point webhook at it
 *   bun run tg:webhook -- <url>     # use an explicit public base URL
 *   bun run tg:webhook -- delete    # remove the webhook
 *   bun run tg:webhook -- info      # print current webhook status
 *
 * Base URL resolution order: explicit arg → PUBLIC_APP_URL → running ngrok
 * tunnel (queried from ngrok's local API at http://127.0.0.1:4040). The webhook
 * is registered at `${base}/api/telegram/webhook`, matching the Caddy (prod) and
 * Next.js dev-rewrite routing.
 */
import { env } from "../env.ts";

const token = env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("✗ TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const api = (method: string, body?: unknown) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json() as Promise<{ ok: boolean; description?: string; result?: unknown }>);

async function detectNgrok(): Promise<string | undefined> {
  try {
    const res = await fetch("http://127.0.0.1:4040/api/tunnels");
    if (!res.ok) return undefined;
    const data = (await res.json()) as { tunnels?: { public_url?: string; proto?: string }[] };
    const https = data.tunnels?.find((t) => t.public_url?.startsWith("https://"));
    return https?.public_url ?? data.tunnels?.[0]?.public_url;
  } catch {
    return undefined;
  }
}

const arg = process.argv[2]?.trim();

if (arg === "delete") {
  const res = await api("deleteWebhook", { drop_pending_updates: true });
  console.log(res.ok ? "✓ webhook deleted" : `✗ ${res.description}`);
  process.exit(res.ok ? 0 : 1);
}

if (arg === "info") {
  const res = await api("getWebhookInfo");
  console.log(JSON.stringify(res.result, null, 2));
  process.exit(0);
}

const base = (arg || env.PUBLIC_APP_URL || (await detectNgrok()))?.replace(/\/$/, "");
if (!base) {
  console.error(
    "✗ No base URL. Pass one explicitly, set PUBLIC_APP_URL, or start ngrok (ngrok http 3000).",
  );
  process.exit(1);
}
if (!base.startsWith("https://")) {
  console.error(`✗ Telegram requires an HTTPS webhook URL, got: ${base}`);
  process.exit(1);
}

const url = `${base}/api/telegram/webhook`;
const res = await api("setWebhook", {
  url,
  secret_token: env.TELEGRAM_WEBHOOK_SECRET || undefined,
  allowed_updates: ["message"],
  drop_pending_updates: true,
});

if (res.ok) {
  console.log(`✓ webhook set → ${url}`);
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    console.warn("  ⚠ TELEGRAM_WEBHOOK_SECRET is unset — the endpoint is unauthenticated.");
  }
} else {
  console.error(`✗ setWebhook failed: ${res.description}`);
  process.exit(1);
}
