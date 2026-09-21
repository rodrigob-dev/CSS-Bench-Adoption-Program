import type { MetadataRoute } from "next";

const site = process.env.SITE_URL ?? "https://css-bench-adoption-program-1.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
