"use client";

import { create } from "zustand";
import type { ViewId, Post } from "@/lib/types";

interface NavState {
  view: ViewId;
  setView: (v: ViewId) => void;
  adminMode: boolean;
  setAdminMode: (b: boolean) => void;
  composerSeed: string | null;
  openComposer: (seed?: string) => void;
  clearComposerSeed: () => void;
  /** When set, the composer loads this post for editing/republishing. */
  composerEditPost: Post | null;
  openComposerWithPost: (post: Post) => void;
  clearComposerEditPost: () => void;
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
  /** Organization sub-section */
  orgTab: string;
  setOrgTab: (tab: string) => void;
  orgExpanded: boolean;
  toggleOrg: () => void;
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),
  adminMode: true,
  setAdminMode: (b) => set({ adminMode: b }),
  composerSeed: null,
  openComposer: (seed) => set({ composerSeed: seed ?? null, view: "composer" }),
  clearComposerSeed: () => set({ composerSeed: null }),
  composerEditPost: null,
  openComposerWithPost: (post) =>
    set({ composerEditPost: post, composerSeed: null, view: "composer" }),
  clearComposerEditPost: () => set({ composerEditPost: null }),
  settingsTab: "profile",
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
  orgTab: "overview",
  setOrgTab: (tab: string) => set({ orgTab: tab }),
  orgExpanded: false,
  toggleOrg: () => set((s) => ({ orgExpanded: !s.orgExpanded })),
}));
