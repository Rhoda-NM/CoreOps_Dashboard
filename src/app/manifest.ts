import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { hostMetadata } from "@/server/routing/metadata";
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { host } = await hostMetadata();
  // Same-origin installation; no account identifiers or last-selected cookies.
  const start = host.kind === "tenant-candidate" || host.kind === "app" ? "/dashboard" : "/";
  return { id: "/", scope: "/", name: brand.name, short_name: brand.name, description: brand.description, start_url: start, display: "standalone", background_color: "#F7F8F5", theme_color: "#143D3B", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" }] };
}
