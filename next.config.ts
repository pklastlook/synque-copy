import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin dev requests from the sandbox preview iframe so that
  // Turbopack HMR doesn't treat them as security violations and crash.
  allowedDevOrigins: ["*.space-z.ai", "*.z.ai"],
};

export default nextConfig;
