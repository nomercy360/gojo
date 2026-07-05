import * as Sentry from "@sentry/nextjs";

// No DSN = documented no-op, safe to ship before a Sentry project exists.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
