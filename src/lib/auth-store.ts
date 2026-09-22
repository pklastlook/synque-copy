"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthRole = "admin" | "manager" | "editor" | "member";

interface AuthUser {
  name: string;
  email: string;
  role: AuthRole;
  title: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (role: AuthRole) => void;
  logout: () => void;
}

const PROFILES: Record<AuthRole, AuthUser> = {
  admin: { name: "Maya Reyes", email: "maya@prism.co", role: "admin", title: "Head of Social" },
  manager: { name: "Daniel Cho", email: "daniel@prism.co", role: "manager", title: "Content Strategist" },
  editor: { name: "Leo Marchetti", email: "leo@prism.co", role: "editor", title: "Video Producer" },
  member: { name: "Tom Becker", email: "tom@prism.co", role: "member", title: "Copywriter" },
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (role) => set({ isAuthenticated: true, user: PROFILES[role] }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    { name: "prism-auth" }
  )
);
