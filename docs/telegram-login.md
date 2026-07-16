# Telegram bot-initiated login

One-tap web login and student navigation started from the bot. A returning
student sends `/start` and gets the available feature commands; `/lessons`
opens the web lesson list already signed in. `/login` remains the direct route
to the dashboard. No password or OTP typing.

## How updates arrive

The API is the bot's only consumer and receives updates with Telegram's
`getUpdates` long polling. On startup it removes any old webhook without
dropping queued updates, refreshes the private-chat command menu, and starts a
50-second long-poll loop. Failed calls retry with bounded exponential backoff.

Only one API process may use a bot token. Production currently runs one
`gojo-api` container; local development must use a separate test bot token.

For each command, the handler looks the user up by `telegramId`:

- **Linked student + `/start`** → show a concise command menu.
- **Linked student + `/lessons`** → reply with a `login_url` button pointing at
  `${PUBLIC_APP_URL}/api/telegram/login/lessons`, which signs in and redirects
  to `/lessons`.
- **Linked account + `/login`** → reply with a `login_url` button pointing at
  `${PUBLIC_APP_URL}/api/telegram/login`. Telegram appends a signed identity to
  the URL (`id`, `auth_date`, `hash`, …).
- **Unlinked account** → create a lead and notify the team. Repeat `/start`
  taps are throttled so they do not create duplicate leads.

`GET /telegram/login` and `GET /telegram/login/lessons` verify the Telegram
signature and a five-minute `auth_date` freshness window, create the site
session, and redirect to `/dashboard` or `/lessons`.

Account linking from `/profile` is separate: it creates a single-use token in
the `verification` table, opens `t.me/<bot>?start=<token>`, and the polling
handler ties the Telegram ID to the signed-in account.

## Local testing

Set a dedicated test bot in the root `.env`, then run the normal development
stack. No tunnel is required for receiving bot commands.

```env
TELEGRAM_BOT_TOKEN=<test-bot-token>
TELEGRAM_BOT_USERNAME=<test-bot-username-without-@>
```

```bash
bun run dev
```

`login_url` buttons still require their destination host to be registered in
BotFather with `/setdomain`. To test those buttons locally, expose port 3000
through an HTTPS tunnel, register the tunnel host, and set:

```env
PUBLIC_APP_URL=https://<your-tunnel-host>
```

## Production

Production starts polling automatically when `TELEGRAM_BOT_TOKEN` is present.
There is no webhook endpoint or webhook registration step. Keep exactly one API
container for the production bot token.
