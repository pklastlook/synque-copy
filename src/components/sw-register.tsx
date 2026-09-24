"use client";

import * as React from "react";

/**
 * Registers the service worker for PWA installability.
 * Call this component once in the app shell.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[SW] Registered with scope:", registration.scope);
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
