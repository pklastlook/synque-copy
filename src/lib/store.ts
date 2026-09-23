"use client";

import { create } from "zustand";
import type { ViewId } from "@/lib/types";

interface NavState {
  view: ViewId;
  setView: (v: ViewId) => void;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  adminMode: boolean;
  setAdminMode: (b: boolean) => void;
  composerSeed: string | null;
  openComposer: (seed?: string) => void;
  clearComposerSeed: () => void;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  settingsExpanded: boolean;
  toggleSettings: () => void;
  mediaTab: string;
  setMediaTab: (tab: string) => void;
  mediaExpanded: boolean;
  toggleMedia: () => void;
  /** Owner Panel sub-section */
  ownerTab: string;
  setOwnerTab: (tab: string) => void;
  ownerExpanded: boolean;
  toggleOwner: () => void;
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
  ownerTab: "customers",
  setOwnerTab: (tab: string) => set({ ownerTab: tab }),
  ownerExpanded: false,
  toggleOwner: () => set((s) => ({ ownerExpanded: !s.ownerExpanded })),
}));
