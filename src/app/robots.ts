import type { MetadataRoute } from "next";
import { hostMetadata } from "@/server/routing/metadata";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { policy, index } = await hostMetadata();
  return index ? { rules: { userAgent: "*", allow: "/", disallow: ["/w/", "/platform", "/account", "/dashboard", "/onboarding", "/invitations/", "/api/", "/sign-in", "/sign-up", "/payments/"] }, sitemap: `${policy.marketingOrigin}/sitemap.xml` } : { rules: { userAgent: "*", disallow: "/" } };
}
