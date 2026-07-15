# Telegram bot-initiated login

One-tap web login started from the bot (getmatch-style). User sends `/start` or
`/login` to the bot → bot replies with a URL button → clicking it opens the site
already signed in. No password, no OTP typing.

## How it works

1. Telegram delivers the command to `POST /telegram/webhook` (registered via
   `setWebhook`, authenticated with `TELEGRAM_WEBHOOK_SECRET`).
2. The handler looks the user up by `telegramId`:
   - **Linked account** → mint a single-use token (5-min TTL, stored in the
     `verification` table), reply with an inline `url` button pointing at
     `${PUBLIC_APP_URL}/api/telegram/login/<token>`.
   - **Unlinked** → create a lead ("request", not a student) and notify the
     team. Repeat `/start` taps are throttled so they don't spawn duplicates.
3. `GET /telegram/login/:token` validates + burns the token, sets the
   better-auth session cookie, and 302-redirects to `/dashboard`.

The token is opaque and single-use — unlike the legacy Login Widget hash, no
reusable identity claims ever sit in the URL / chat history.

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
