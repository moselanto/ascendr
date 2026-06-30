// Shared domain types for the ASCENDR alive slice (Phase 1).

export type Profile = {
  id: string;
  auth_user_id: string;
  handle: string | null;
  full_name: string | null;
  role: "member" | "mentor" | "employer" | "enterprise_admin" | "admin";
  avatar_url: string | null;
  bio: string | null;
  verified_expert: boolean;
  created_at: string;
};

export type Community = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  visibility: "public" | "private" | "paid";
  member_count: number;
  created_at: string;
};

export type ChannelMessage = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string | null;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "handle" | "avatar_url"> | null;
};

export type FeedPost = {
  id: string;
  author_id: string;
  community_id: string | null;
  kind: string;
  body: string | null;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "handle" | "avatar_url"> | null;
};

export type Streak = {
  user_id: string;
  current_len: number;
  longest_len: number;
  last_active_date: string | null;
};
