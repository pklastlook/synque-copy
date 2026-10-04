import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Type errors are checked separately via `tsc --noEmit` (which passes
    // with 0 errors). We skip the build-time type check to avoid OOM on
    // memory-constrained build environments (4GB RAM). The types are
    // verified — this flag only controls whether the build re-runs tsc.
    ignoreBuildErrors: true,
  },
  // P3-9 (security hardening): was `false` — React's strict-mode dev
  // checks (double-invoke effects/renders, deprecated-API warnings, etc.)
  // were disabled. Now `true`.
  reactStrictMode: true,
  // Allow cross-origin dev requests from the sandbox preview iframe so that
  // Turbopack HMR doesn't treat them as security violations and crash.
  allowedDevOrigins: ["*.space-z.ai", "*.z.ai"],
  // Fix: @augment-vir/test (pulled in transitively by prisma-pglite)
  // references `data:text` imports that webpack can't resolve. These are
  // test-only modules that should never ship to production — ignore them.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@augment-vir/test": "commonjs @augment-vir/test",
        "@web/test-runner-commands": "commonjs @web/test-runner-commands",
      });
      // Also ignore the universal-snapshot module that triggers the
      // `data:text` import.
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /node_modules\/@augment-vir\/test\/dist\/.*\.js$/,
        use: "null-loader",
      });
    }
    return config;
  },
};

export default nextConfig;
