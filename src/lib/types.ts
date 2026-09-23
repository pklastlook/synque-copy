export type ViewId =
  | "dashboard"
  | "composer"
  | "calendar"
  | "analytics"
  | "inbox"
  | "accounts"
  | "team"
  | "settings"
  | "campaigns"
  | "media"
  | "listening"
  | "hashtags"
  | "competitors"
  | "reports"
  | "linkbio"
  | "mail"
  | "whatsapp"
  | "admin"
  | "owner"
  | "team-performance";

export interface PlatformAccount {
  id: string;
  platform: import("@/lib/platforms").PlatformId;
  handle: string;
  displayName: string;
  avatar: string | null;
  followers: number;
  verified: boolean;
  ownerId: string;
  ownerName: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "admin" | "member";
  title: string | null;
  color: string | null;
  postsCount: number;
  accountsCount: number;
}

export interface PostVariant {
  id: string;
  accountId: string;
  platform: import("@/lib/platforms").PlatformId;
  handle: string;
  content: string;
  hashtags: string | null;
  status: "draft" | "scheduled" | "published" | "failed";
  publishedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  saves: number;
}

export interface Post {
  id: string;
  title: string;
  caption: string;
  mediaUrl: string | null;
  mediaType: string;
  tone: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt: string | null;
  authorId: string;
  authorName: string;
  variants: PostVariant[];
  createdAt: string;
}

export interface Comment {
  id: string;
  accountId: string;
  platform: import("@/lib/platforms").PlatformId;
  handle: string;
  author: string;
  authorAvatar: string | null;
  text: string;
  type: "comment" | "message" | "mention";
  sentiment: "positive" | "neutral" | "negative";
  replied: boolean;
  assigneeName: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface AnalyticsPoint {
  date: string;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  posts: number;
}
