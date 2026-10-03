"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  avatar?: string | null;
  bio?: string | null;
  timezone?: string | null;
  language?: string | null;
  department?: string | null;
  customerId?: string | null;
  emailVerified?: string | null; // ISO date string — null until the user verifies
  twoFactorEnabled?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  // 2FA login flow — set when /api/auth/login returns { requires2FA: true }
  // instead of a full session. The UI uses this + complete2faLogin() to
  // prompt for a TOTP code.
  pending2FA: { tempToken: string; email: string } | null;
  signup: (name: string, email: string, password: string, company?: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  loginAsDemo: () => Promise<boolean>;
  complete2faLogin: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  /** Patch the current user object in the store + persisted localStorage.
   *  Used by Settings → Profile after avatar upload or profile edits so
   *  the sidebar/header avatar updates without a full page reload. */
  updateUser: (patch: Partial<AuthUser>) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      pending2FA: null,

      signup: async (name, email, password, company) => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, company }),
          });
          // Guard: if the server returned HTML (e.g. 500 error page), don't
          // try to parse it as JSON — that throws and can leave the button stuck.
          if (!res.ok) {
            set({ loading: false });
            return false;
          }
          const data = await res.json().catch(() => null);
          if (data?.token) {
            set({
              isAuthenticated: true,
              user: data.user,
              token: data.token,
              loading: false,
            });
            return true;
          }
          set({ loading: false });
          return false;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          // Guard: if the server returned HTML (e.g. 500 error page), don't
          // try to parse it as JSON — that throws and can leave the button stuck.
          if (!res.ok) {
            set({ loading: false });
            return false;
          }
          const data = await res.json().catch(() => null);
          // 2FA path — server says the user needs to enter a TOTP code.
          // Stash the tempToken + show the 2FA prompt (UI watches pending2FA).
          if (data?.requires2FA && data?.tempToken) {
            set({
              loading: false,
              pending2FA: { tempToken: data.tempToken, email: data.email ?? email },
            });
            return false;
          }
          if (data?.token) {
            set({
              isAuthenticated: true,
              user: data.user,
              token: data.token,
              loading: false,
              pending2FA: null,
            });
            return true;
          }
          set({ loading: false });
          return false;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      complete2faLogin: async (code) => {
        const pending = get().pending2FA;
        if (!pending) return false;
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/2fa/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tempToken: pending.tempToken, code }),
          });
          if (!res.ok) {
            set({ loading: false });
            return false;
          }
          const data = await res.json().catch(() => null);
          if (data?.token) {
            set({
              isAuthenticated: true,
              user: data.user,
              token: data.token,
              loading: false,
              pending2FA: null,
            });
            return true;
          }
          set({ loading: false });
          return false;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      loginAsDemo: async () => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/demo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) {
            set({ loading: false });
            return false;
          }
          const data = await res.json().catch(() => null);
          if (data?.token) {
            set({
              isAuthenticated: true,
              user: data.user,
              token: data.token,
              loading: false,
            });
            return true;
          }
          set({ loading: false });
          return false;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      logout: async () => {
        const token = get().token;
        // Clear local state IMMEDIATELY so the UI responds instantly —
        // the user sees the login screen without waiting for the server
        // round-trip or cache deletion. The server-side session revocation
        // + cache clearing happen in the background (fire-and-forget).
        set({ isAuthenticated: false, user: null, token: null, pending2FA: null });

        // Best-effort — revoke the server-side session so it can't be reused.
        // No await — fire-and-forget so the UI doesn't wait for the DB write.
        if (token) {
          fetch("/api/auth/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }

        // P3-10: clear the service-worker Cache API on the client too.
        // Fire-and-forget — don't block the logout UI.
        if (typeof caches !== "undefined") {
          caches.keys().then((keys) =>
            Promise.all(keys.map((k) => caches.delete(k)))
          ).catch(() => {});
        }
      },

      fetchUser: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.user) {
            set({ isAuthenticated: true, user: data.user });
          } else {
            set({ isAuthenticated: false, user: null, token: null });
          }
        } catch {
          // keep existing state on network error
        }
      },

      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },
    }),
    {
      name: "socialflow-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
