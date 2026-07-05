import * as Sentry from "@sentry/nextjs";

// Client-side DSN must be NEXT_PUBLIC_* — inlined into the browser bundle at
// build time (see apps/web/Dockerfile), same as NEXT_PUBLIC_API_URL. No DSN =
// documented no-op, safe to ship before a Sentry project exists.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
