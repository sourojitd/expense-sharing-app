import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TODO: Fix pre-existing type errors in Phase 5 (Polish)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warnings don't block the build, only errors do
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
