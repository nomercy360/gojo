import type { MetadataRoute } from "next";

// The lead magnet under /guides is gated behind the /miner form: it's the
// deliverable people trade their contact for. Keep it out of search indexes so
// the PDF can't be found (and the form bypassed) via a query. Everything else
// stays crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/guides/",
    },
  };
}
