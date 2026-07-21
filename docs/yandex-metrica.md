# Yandex Metrica setup

The web app uses counter `110915443`. The counter ID is public and is the only
value required by the browser tag; there is no browser-side secret or API key.

It is read from `NEXT_PUBLIC_YANDEX_METRICA_COUNTER_ID`, which is inlined into
the client bundle at build time. Production gets it from the `deploy.yml` build
arg (override with the `YANDEX_METRICA_COUNTER_ID` repository variable). It is
deliberately **unset for local development and preview builds**, where the tag
never loads and `track()` is a no-op — otherwise every `bun dev` session with
consent accepted would land in the live counter. E2E runs against a throwaway
counter id set in `playwright.config.ts`.

## Counter setup

1. Sign in at <https://metrica.yandex.com/> with the account that should own the
   data. The product-manager snippet shows that the counter already exists, so
   open counter `110915443` instead of creating another one. If it belongs to a
   different account, ask its owner to grant access in Settings → Access.
2. In Settings → Tag, set the primary site to `gojolearn.ru` and add any real
   aliases (for example, `www.gojolearn.ru`) as additional addresses.
3. Keep Click map, link tracking, accurate bounce tracking, and Session Replay
   enabled. The app initializes the tag with `defer: true` and explicitly sends
   the first page view plus every Next.js App Router navigation, as required for
   an SPA.
4. In Session Replay settings, turn **Record all fields** off. The app also marks
   every shared input as `ym-disable-keys` and hides all private student,
   payment, lesson, teacher, and login pages with `ym-hide-content`. Page views
   for those routes are reported with the route shape only — the query string is
   dropped and id-like path segments become `:id`, so no student, lesson, or
   payment identifier ever reaches Metrica's URL reports.
5. In Additional data processing conditions, enable **Do not store full IP
   addresses of site visitors**.
6. Enable **Restricted mode** unless a reviewed advertising use case requires
   the additional cross-site signals; incoming UTM attribution still comes from
   the page URL.
7. Leave E-commerce disabled for now. The supplied snippet enables
   `dataLayer`, but the app does not currently emit Yandex E-commerce objects.
   Enabling it would not create trustworthy purchase reporting.
8. Avoid automatic goals that duplicate the explicit JavaScript goals below.
9. Deploy, accept analytics in the consent dialog, then open
   `https://gojolearn.ru/?_ym_debug=2`. The browser console/debug panel should
   show counter `110915443`, a `PageView`, and `Reach goal` entries after the
   corresponding actions.

The `noscript` image from the generated snippet is intentionally not installed:
a browser with JavaScript disabled cannot provide the site's affirmative
analytics choice, so loading it would bypass the consent gate.

## Goals and parameters

In Metrica, go to Goals → Add goal, choose **JavaScript event**, and create the
following exact identifiers. Goal parameters are low-cardinality product facts;
never add names, email addresses, phone numbers, account IDs, free-text answers,
or personal data to them.

| Goal ID | Meaning | Parameters emitted |
| --- | --- | --- |
| `ym-open-leadform` | Trial-lesson modal opened | `placement` |
| `ym-open-chat` | Telegram lead link clicked | `placement`, `channel=telegram` |
| `ym-submit-leadform` | Email lead accepted by the API | `placement`, `channel=email`, `result` |
| `ym-start-course` | First kana answer | `correct` |
| `kana_open` | Kana trainer initialized | `returning`, `learned` |
| `kana_row_complete` | Kana row completed | `script`, `row`, `accuracy` |
| `kana_word_unlocked` | Kana word unlocked | `word`, `first` |
| `kana_review_complete` | Free review completed | `correct`, `total`, `mode` |
| `kana_save_clicked` | Teacher CTA clicked from kana | `learned`, `placement` |
| `kana_wall_shown` | Honest-wall step shown | `learned` |
| `kana_ask_shown` | Teacher offer shown | none |
| `kana_ask_clicked` | Teacher offer clicked | none |
| `quiz_open` | Placement quiz initialized | none |
| `quiz_declared` | Starting level declared | `start` |
| `quiz_to_kana` | Quiz routed user to kana | none |
| `quiz_completed` | Placement result saved | `level`, `assessment`, `correct`, `total` |

The three `ym-*` identifiers follow Yandex's recommended goal names for an
education/service funnel. UTM values are not copied into goal parameters:
Metrica attributes each goal to the visit automatically, which avoids duplicate
and inconsistent campaign dimensions.

## Telegram and Instagram UTM links

Use lowercase values consistently; Metrica treats tag values as case-sensitive.
The first query parameter starts with `?`, and later parameters use `&`.

Telegram channel/post:

```text
https://gojolearn.ru/?utm_source=telegram&utm_medium=messenger&utm_campaign=summer_2026&utm_content=channel_post
```

Instagram bio:

```text
https://gojolearn.ru/?utm_source=instagram&utm_medium=social&utm_campaign=summer_2026&utm_content=bio
```

Instagram story variant:

```text
https://gojolearn.ru/?utm_source=instagram&utm_medium=social&utm_campaign=summer_2026&utm_content=story_trial_lesson
```

Keep `utm_campaign` stable for the campaign and use `utm_content` to distinguish
placements or creatives. Do not put usernames, emails, Telegram IDs, or other
personal data in any UTM value. Results appear under Reports → Sources → UTM
tags; Telegram is also classified in the Messengers report and Instagram in
social-source reports.

## Optional API credentials

No OAuth credential is needed for the integration in this repository. If a
server-side reporting or counter-management job is added later:

1. Create a Yandex OAuth application for API access/debugging.
2. Request only `metrika:read` for reports, or add `metrika:write` only if the
   job must manage counters or goals.
3. Copy the ClientID and authorize with
   `https://oauth.yandex.com/authorize?response_type=token&client_id=<client_id>`.
4. Store the returned token only in a server secret and send it as
   `Authorization: OAuth <token>` to `api-metrika.yandex.net`. Never expose it
   through a `NEXT_PUBLIC_*` variable or commit it.
