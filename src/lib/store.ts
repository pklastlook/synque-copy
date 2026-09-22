"use client";

import { create } from "zustand";
import type { ViewId } from "@/lib/types";

interface NavState {
  view: ViewId;
  setView: (v: ViewId) => void;
  /** current acting user id (admin view lets you impersonate a member) */
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  /** admin mode shows all-team data */
  adminMode: boolean;
  setAdminMode: (b: boolean) => void;
  /** composer pre-fill state (open composer with seed) */
  composerSeed: string | null;
  openComposer: (seed?: string) => void;
  clearComposerSeed: () => void;
  /** active settings sub-section (driven from the main sidebar) */
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  /** whether the Settings group is expanded in the sidebar */
  settingsExpanded: boolean;
  toggleSettings: () => void;
  /** active media library sub-section (driven from the main sidebar) */
  mediaTab: string;
  setMediaTab: (tab: string) => void;
  /** whether the Media Library group is expanded in the sidebar */
  mediaExpanded: boolean;
  toggleMedia: () => void;
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),
  currentUserId: "u-admin",
  setCurrentUserId: (id) => set({ currentUserId: id }),
  adminMode: true,
  setAdminMode: (b) => set({ adminMode: b }),
  composerSeed: null,
  openComposer: (seed) => set({ composerSeed: seed ?? null, view: "composer" }),
  clearComposerSeed: () => set({ composerSeed: null }),
  settingsTab: "team-roles",
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  settingsExpanded: false,
  toggleSettings: () => set((s) => ({ settingsExpanded: !s.settingsExpanded })),
  mediaTab: "all",
  setMediaTab: (tab) => set({ mediaTab: tab }),
  mediaExpanded: false,
  toggleMedia: () => set((s) => ({ mediaExpanded: !s.mediaExpanded })),
}));
