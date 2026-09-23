"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,

      signup: async (name, email, password) => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
          });
          const data = await res.json();
          if (res.ok && data.token) {
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
          const data = await res.json();
          if (res.ok && data.token) {
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

      logout: () => {
        set({ isAuthenticated: false, user: null, token: null });
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
