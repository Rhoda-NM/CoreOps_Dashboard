import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Avoid restoring stale route trees after the observed local cache panic.
    // This affects development only; production build settings are unchanged.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
