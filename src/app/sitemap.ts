import type { MetadataRoute } from "next";
import { hostMetadata } from "@/server/routing/metadata";
import { getAuthConfiguration } from "@/config/auth";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { policy, index } = await hostMetadata();
  const origin = policy.marketingOrigin;
  if (!index) return [];
  const paths = ["/", "/features", "/pricing", "/demo", ...(getAuthConfiguration().legalReady ? ["/terms", "/privacy"] : [])];
  return paths.map(path => ({ url: `${origin}${path}`, changeFrequency: "monthly", priority: path === "/" ? 1 : 0.5 }));
}
