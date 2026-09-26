"use client";

import * as React from "react";

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem("socialflow-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export function useApi<T>(url: string | null) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(!!url);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(
    (opts?: { silent?: boolean }) => {
      if (!url) return;
      // "silent" reloads (background polling) don't flip loading=true,
      // so the UI doesn't flash a skeleton every few seconds.
      if (!opts?.silent) setLoading(true);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch(url, { headers })
        .then(async (r) => {
          if (!r.ok) {
            // Try to extract a meaningful error message from the response
            const msg = await r.text().catch(() => "");
            throw new Error(msg ? `Request failed (${r.status})` : `Request failed (${r.status})`);
          }
          return r.json();
        })
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e.message ?? "Network error"))
        .finally(() => {
          if (!opts?.silent) setLoading(false);
        });
    },
    [url]
  );

  React.useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 100_000 ? 0 : 1) + "K";
  return Math.round(n).toString();
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
