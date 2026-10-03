import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    // P3-9 (security hardening): was `true` — silently shipped type errors
    // to production. Now `false` so the build fails on any TS error.
    ignoreBuildErrors: false,
  },
  // P3-9 (security hardening): was `false` — React's strict-mode dev
  // checks (double-invoke effects/renders, deprecated-API warnings, etc.)
  // were disabled. Now `true`.
  reactStrictMode: true,
  // Allow cross-origin dev requests from the sandbox preview iframe so that
  // Turbopack HMR doesn't treat them as security violations and crash.
  allowedDevOrigins: ["*.space-z.ai", "*.z.ai"],
};

export default nextConfig;
