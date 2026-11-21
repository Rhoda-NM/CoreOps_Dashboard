import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Response protection only: token/reference formats and redirects are unchanged.
    return ["/invitations/:path*", "/payments/paystack/return", "/sign-in/:path*", "/sign-up/:path*", "/account/staging-terms", "/account/legal/:path*"].map(source => ({
      source,
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
  experimental: {
    // Avoid restoring stale route trees after the observed local cache panic.
    // This affects development only; production build settings are unchanged.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
