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
  // Dev-only single-origin proxy so localhost:3000 fronts the API exactly like
  // Caddy does in prod (/api/* stripped, /auth/* kept). This lets a tunnel of
  // :3000 exercise one-tap Telegram login with shared cookies. Inert in prod
  // (Caddy handles /api and /auth at the edge).
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    const api = process.env.API_PROXY_TARGET ?? "http://localhost:3001";
    return [
      { source: "/api/:path*", destination: `${api}/:path*` },
      { source: "/auth/:path*", destination: `${api}/auth/:path*` },
    ];
  },
};

// No org/project/authToken configured yet -- source map upload is skipped
// (raw, non-source-mapped stack traces still work fine) until those exist.
export default withSentryConfig(config, {
  silent: true,
  webpack: { treeshake: { removeDebugLogging: true } },
});
