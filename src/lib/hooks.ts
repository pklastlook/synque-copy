"use client";

import * as React from "react";

export function useApi<T>(url: string | null) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(!!url);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    if (!url) return;
    setLoading(true);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message ?? "Error"))
      .finally(() => setLoading(false));
  }, [url]);

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
