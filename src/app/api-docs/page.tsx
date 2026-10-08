"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "next-themes";

/**
 * /api-docs — interactive Swagger UI for the SYNQUE API.
 *
 * Protected by requireAuth: only logged-in users can see this page.
 * Unauthenticated visitors are redirected to /login (so they can sign
 * in + come back). The page itself is a thin wrapper around
 * `swagger-ui-react` that fetches the OpenAPI spec from /api/docs,
 * injecting the caller's JWT as `Bearer` on every Try-It-Out request.
 */
export default function ApiDocsPage() {
  const { isAuthenticated, token, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [spec, setSpec] = React.useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Redirect unauthenticated users to /login. We wait until `loading`
  // flips to false so we don't redirect during the initial hydration.
  React.useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push("/login?next=/api-docs");
    }
  }, [loading, isAuthenticated, router]);

  // Fetch the OpenAPI spec from /api/docs with the user's JWT.
  React.useEffect(() => {
    if (!isAuthenticated || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/docs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as Record<string, unknown>;
        if (!cancelled) {
          setSpec(json);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  // Build a request interceptor that injects the JWT Bearer header on
  // every Try-It-Out request, so users can hit "Authorize" once (or not
  // at all) and every call is authenticated with their session token.
  const requestInterceptor = React.useCallback(
    (req: { headers?: Record<string, string> }) => {
      if (token) {
        req.headers = {
          ...(req.headers ?? {}),
          Authorization: `Bearer ${token}`,
        };
      }
      return req;
    },
    [token],
  );

  // While we don't know if the user is authenticated yet, show a loader.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="shimmer h-12 w-12 rounded-full" />
      </div>
    );
  }

  // Unauthenticated — the redirect effect will fire; render a placeholder.
  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to sign in…
          </p>
          <a
            href="/login?next=/api-docs"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme={resolvedTheme === "dark" ? "dark" : "light"}
      className="min-h-screen bg-background text-foreground"
    >
      <div className="border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-sm font-semibold text-foreground hover:underline"
            >
              ← Back to SYNQUE
            </a>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-semibold">SYNQUE API Reference</span>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-500">
            Authenticated
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-2 py-3">
        {loadError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">
            Failed to load API spec: <code>{loadError}</code>
            <button
              onClick={() => setLoadError(null)}
              className="ml-3 rounded-md bg-rose-500/20 px-2 py-1 text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : !spec ? (
          <div className="grid place-items-center py-24">
            <div className="shimmer h-10 w-10 rounded-full" />
            <p className="mt-3 text-xs text-muted-foreground">Loading spec…</p>
          </div>
        ) : (
          <SwaggerUI
            spec={spec}
            requestInterceptor={requestInterceptor}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            filter={true}
            tryItOutEnabled={false}
            persistAuthorization={true}
          />
        )}
      </div>
    </div>
  );
}

