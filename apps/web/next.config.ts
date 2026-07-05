import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/gojo-dev/**" },
    ],
  },
};

// No org/project/authToken configured yet -- source map upload is skipped
// (raw, non-source-mapped stack traces still work fine) until those exist.
export default withSentryConfig(config, {
  silent: true,
  webpack: { treeshake: { removeDebugLogging: true } },
});
