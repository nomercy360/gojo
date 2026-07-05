import * as Sentry from "@sentry/bun";
import { env } from "./env.ts";

// Must be imported first, before any other module, per @sentry/bun docs.
// With no DSN, Sentry.init() is a documented no-op — safe to deploy before a
// real project/DSN exists.
Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
});
