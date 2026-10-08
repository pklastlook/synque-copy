# Dockerfile — REMAINING-4
#
# Multi-stage build for the main Next.js 16 app.
#
# Stage 1 (builder): install all deps, build the standalone Next.js output.
# Stage 2 (runner): copy the standalone server + static assets into a
# minimal image and run it with `bun`.
#
# The build uses `--webpack` (Next 16 still ships webpack as a fallback
# alongside Turbopack) so the standalone output is reproducible without
# the experimental Turbopack standalone splitter.

# ─── Stage 1: builder ────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy lockfile + package.json first so deps are cached across code changes.
COPY package.json bun.lock ./

# Install ALL deps (including devDependencies — we need them for the build).
RUN bun install --frozen-lockfile

# Copy the rest of the source.
COPY . .

# Generate the Prisma client (the build imports @prisma/client).
RUN bunx prisma generate

# Build the standalone Next.js output.
RUN bun run build

# ─── Stage 2: runner ─────────────────────────────────────────────────
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user for security hygiene.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the standalone server output (Next 16 standalone mode puts it in
# .next/standalone — server.js is at the root of that tree).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["bun", "server.js"]
