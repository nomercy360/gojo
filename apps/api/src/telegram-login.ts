import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { SignJWT, jwtVerify } from "jose";
import * as oidc from "openid-client";
import { env } from "./env.ts";

const STATE_COOKIE = "gojo_tg_state";
const VERIFIER_COOKIE = "gojo_tg_verifier";
// Path "/" (not "/leads/telegram"): in prod Caddy strips the "/api" prefix
// before the API, so the API sets the cookie path from its own view while the
// browser is actually at "/api/leads/telegram/callback". A scoped path would
// never match there and the cookies wouldn't be sent back → invalid_state.
// These are short-lived (600s), httpOnly and deleted at the callback.
const COOKIE_PATH = "/";
const DISCOVERY_URL = new URL("https://oauth.telegram.org/.well-known/openid-configuration");

export type TelegramIdentity = {
  id: number;
  name: string;
  username?: string;
  picture?: string;
};

// The certified OIDC client (openid-client) drives the whole flow — PKCE,
// state, the token exchange, and id_token/JWKS validation. We only hand-roll
// the short-lived proof JWT the browser hands back to POST /leads.
const secret = () => new TextEncoder().encode(env.JWT_SECRET);

// Discovery is one network round-trip; cache the Configuration across requests
// but let a failed discovery retry on the next login attempt.
let configPromise: Promise<oidc.Configuration> | undefined;

function telegramConfig() {
  if (!env.TELEGRAM_LOGIN_CLIENT_SECRET || !env.TELEGRAM_LOGIN_REDIRECT_URI) {
    throw new HTTPException(503, { message: "telegram_login_not_configured" });
  }
  if (!configPromise) {
    configPromise = oidc
      .discovery(DISCOVERY_URL, env.TELEGRAM_LOGIN_CLIENT_ID, env.TELEGRAM_LOGIN_CLIENT_SECRET)
      .catch((error) => {
        configPromise = undefined;
        throw error;
      });
  }
  return { config: configPromise, redirectUri: env.TELEGRAM_LOGIN_REDIRECT_URI };
}

export async function startTelegramLogin(c: Context) {
  const { config, redirectUri } = telegramConfig();
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const cookie = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: COOKIE_PATH,
    maxAge: 600,
  };
  setCookie(c, STATE_COOKIE, state, cookie);
  setCookie(c, VERIFIER_COOKIE, verifier, cookie);
  const url = oidc.buildAuthorizationUrl(await config, {
    redirect_uri: redirectUri,
    // openid+profile → id/name/username/picture claims; telegram:bot_access
    // lets the bot message the lead afterwards (the point of the funnel).
    scope: "openid profile telegram:bot_access",
    state,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
  });
  return c.redirect(url.href);
}

export async function finishTelegramLogin(c: Context) {
  const { config, redirectUri } = telegramConfig();
  const state = getCookie(c, STATE_COOKIE);
  const verifier = getCookie(c, VERIFIER_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: COOKIE_PATH });
  deleteCookie(c, VERIFIER_COOKIE, { path: COOKIE_PATH });
  if (!state || !verifier) {
    return popup(c, { error: "invalid_or_expired_state" });
  }
  try {
    // Rebuild the callback URL from the registered redirect_uri + the query
    // Telegram appended (?code&state) so validation is unaffected by any proxy
    // rewriting of host/proto on the raw request URL.
    const callbackUrl = new URL(redirectUri);
    callbackUrl.search = new URL(c.req.url).search;
    const tokens = await oidc.authorizationCodeGrant(await config, callbackUrl, {
      pkceCodeVerifier: verifier,
      expectedState: state,
      idTokenExpected: true,
    });
    const identity = identityFromClaims(tokens.claims());
    const proof = await new SignJWT(identity)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("gojo-api")
      .setAudience("telegram-lead")
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(secret());
    return popup(c, { proof, user: identity });
  } catch (error) {
    console.error("Telegram OIDC callback failed:", error);
    return popup(c, { error: "telegram_login_failed" });
  }
}

function identityFromClaims(claims: oidc.IDToken | undefined): TelegramIdentity {
  if (!claims) throw new Error("missing_id_token");
  // The Telegram user id is the numeric `id` claim (granted by the `profile`
  // scope). `sub` is a large opaque subject *string* that overflows
  // MAX_SAFE_INTEGER — using it as the id makes the safe-integer check fail.
  const id = typeof claims.id === "number" ? claims.id : Number(claims.id);
  const name = typeof claims.name === "string" ? claims.name.trim() : "";
  if (!Number.isSafeInteger(id) || id <= 0 || !name) throw new Error("invalid_profile");
  return {
    id,
    name,
    ...(typeof claims.preferred_username === "string"
      ? { username: claims.preferred_username.toLowerCase() }
      : {}),
    ...(typeof claims.picture === "string" ? { picture: claims.picture } : {}),
  };
}

export async function verifyTelegramProof(proof: string): Promise<TelegramIdentity> {
  try {
    const { payload } = await jwtVerify(proof, secret(), {
      issuer: "gojo-api",
      audience: "telegram-lead",
      algorithms: ["HS256"],
    });
    const id = Number(payload.id);
    const name = typeof payload.name === "string" ? payload.name : "";
    if (!Number.isSafeInteger(id) || id <= 0 || !name) throw new Error();
    return {
      id,
      name,
      ...(typeof payload.username === "string" ? { username: payload.username } : {}),
      ...(typeof payload.picture === "string" ? { picture: payload.picture } : {}),
    };
  } catch {
    throw new HTTPException(401, { message: "invalid_telegram_proof" });
  }
}

// The opener (the booking modal) only accepts a message whose target origin
// matches its own. In dev the API runs on 127.0.0.1 while WEB_ORIGIN may be
// localhost (or vice versa) — same machine, different origin — so post to both
// loopback spellings. postMessage only delivers to the window that actually
// matches, so the non-matching target is a harmless no-op. Prod has a single
// real domain with no sibling, so this posts exactly once.
function webTargetOrigins(): string[] {
  const origins = new Set([env.WEB_ORIGIN]);
  try {
    const url = new URL(env.WEB_ORIGIN);
    const sibling = { localhost: "127.0.0.1", "127.0.0.1": "localhost" }[url.hostname];
    if (sibling) {
      url.hostname = sibling;
      origins.add(url.origin);
    }
  } catch {
    // WEB_ORIGIN is validated as a URL in env.ts; the catch is belt-and-braces.
  }
  return [...origins];
}

function popup(c: Context, payload: object) {
  const data = JSON.stringify(payload).replace(/</g, "\\u003c");
  const targets = JSON.stringify(webTargetOrigins());
  return c.html(`<!doctype html><meta charset="utf-8"><script>
if (window.opener) for (var o of ${targets}) window.opener.postMessage({type:"gojo:telegram-login",payload:${data}},o);
window.close();
</script><p>Авторизация завершена. Это окно можно закрыть.</p>`);
}
