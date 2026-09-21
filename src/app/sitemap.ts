import type { MetadataRoute } from "next";
import { PARK } from "@/lib/park";
import { getAllBenches } from "@/lib/queries";

const site = process.env.SITE_URL ?? "https://css-bench-adoption-program-1.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const benches = await getAllBenches();
  return [
    { url: `${site}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${site}/about`, changeFrequency: "monthly", priority: 0.6 },
    ...PARK.areas.map((a) => ({ url: `${site}/areas/${a.id}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...benches.map((b) => ({ url: `${site}/benches/${b.id}`, changeFrequency: "daily" as const, priority: 0.5 })),
  ];
}
