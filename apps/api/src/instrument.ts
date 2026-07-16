import * as Sentry from "@sentry/bun";
import { env } from "./env.ts";

// Must be imported first, before any other module, per @sentry/bun docs.
// The API has its own DSN/project so backend failures do not get mixed into
// the browser/Next.js issue stream.
Sentry.init({
  dsn: env.SENTRY_DSN_API,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
});
