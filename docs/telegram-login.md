# Telegram bot-initiated login

One-tap web login and student navigation started from the bot. A returning
student sends `/start` and gets the available feature commands; `/lessons`
opens the web lesson list already signed in. `/login` remains the direct route
to the dashboard. No password or OTP typing.

## How it works

1. Telegram delivers the command to `POST /telegram/webhook` (registered via
   `setWebhook`, authenticated with `TELEGRAM_WEBHOOK_SECRET`).
2. The handler looks the user up by `telegramId`:
   - **Linked student + `/start`** → show a concise command menu.
   - **Linked student + `/lessons`** → reply with a `login_url` button pointing
     at `${PUBLIC_APP_URL}/api/telegram/login/lessons`, which signs in and
     redirects to `/lessons`.
   - **Linked account + `/login`** → reply with a `login_url` button pointing at
     `${PUBLIC_APP_URL}/api/telegram/login`. `login_url` (not a plain `url`
     button) gives the native "Log in to <domain>?" prompt and makes Telegram
     append a **signed identity** to the URL (`id`, `auth_date`, `hash`, …).
   - **Unlinked** → create a lead ("request", not a student) and notify the
     team. Repeat `/start` taps are throttled so they don't spawn duplicates.
3. `GET /telegram/login` and `GET /telegram/login/lessons` verify the `hash`
   (`HMAC-SHA256(sorted data-check-string, key = SHA256(bot_token))` — the Login
   Widget scheme), checks `auth_date` freshness (5-min replay window), then logs
   the user in by `telegramId`. The first redirects to `/dashboard`; the second
   redirects to `/lessons`. Both are stateless — no token minted or stored.

`bun run tg:webhook` also calls `setMyCommands` for private chats so Telegram's
native Menu shows `/start`, `/lessons`, `/login`, and `/help`. Run it again after
changing the command list.

> `login_url` requires the button host be registered in BotFather via
> `/setdomain` (the ngrok host locally, `gojolearn.ru` in prod); an unregistered
> host is rejected on send with `BOT_DOMAIN_INVALID`. A plain `url` button would
> avoid `/setdomain` but does **not** append the signed fields, so login would
> have nothing to verify.

Account **linking** (Connect Telegram in `/profile`) is separate: it mints a
single-use token in the `verification` table (`tg-link:<token>`), opens
`t.me/<bot>?start=<token>`, and the `/start <token>` webhook ties `telegramId` to
the account.

## Local testing with ngrok

The webhook needs a public HTTPS URL Telegram can reach. A dev-only Next.js
rewrite (`apps/web/next.config.ts`) makes `localhost:3000` front the API under
one origin (exactly like Caddy in prod: `/api/*` stripped, `/auth/*` kept), so
cookies work end-to-end when you tunnel just `:3000`.

```bash
# 0. one-time: install ngrok + set an authtoken (a reserved domain keeps the
#    URL stable across restarts so you don't reconfigure each run)
brew install ngrok && ngrok config add-authtoken <token>

# 1. run the app
bun run dev

# 2. tunnel the web origin (single-origin proxy handles /api + /auth)
ngrok http 3000            # or: ngrok http --domain=<your>.ngrok-free.app 3000

# 3. point the bot's webhook at the tunnel (auto-detects the ngrok URL)
bun run tg:webhook
```

Set these in the root `.env` for the run:

```
TELEGRAM_WEBHOOK_SECRET=<any-random-string>
PUBLIC_APP_URL=https://<subdomain>.ngrok-free.app   # optional; else auto-detected
```

Then message the bot `/login`. Useful webhook commands:

```bash
bun run tg:webhook -- info      # show current webhook status
bun run tg:webhook -- delete    # remove the webhook (back to send-only)
bun run tg:webhook -- <url>     # register an explicit base URL
```

## Production

Set `TELEGRAM_WEBHOOK_SECRET` in `.env.prod`. `PUBLIC_APP_URL` defaults to
`WEB_ORIGIN` (correct behind Caddy). After deploy, register once:

```bash
PUBLIC_APP_URL=https://gojolearn.ru bun run tg:webhook
```
