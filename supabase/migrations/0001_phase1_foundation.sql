-- ASCENDR — Phase 1 foundation schema
-- Source of truth: ASCENDR Global Product Strategy & Master PRD, Section 14 (Database Design / ERD).
-- This is the P1 "retention engine + AI wedge" slice. Extend in later migrations.
-- NOTE: This is an independent database for ASCENDR (separate Supabase project from MentorBay).

-- Required extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;   -- pgvector, for AI Mentor Clone embeddings

-- ============ Profiles ============
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique,                       -- maps to auth.users.id
  handle text unique,
  full_name text,
  role text not null default 'member'             -- guest|member|mentor|employer|enterprise_admin|admin
    check (role in ('member','mentor','employer','enterprise_admin','admin')),
  avatar_url text,
  bio text,
  verified_expert boolean default false,
  created_at timestamptz default now()
);

-- ============ Communities & membership ============
create table if not exists communities (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references profiles(id),
  slug text unique not null,
  name text not null,
  description text,
  cover_url text,
  visibility text default 'public' check (visibility in ('public','private','paid')),
  price_kes integer,
  billing_interval text check (billing_interval in ('one_time','monthly','yearly')),
  member_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists community_members (
  community_id uuid references communities(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner','moderator','member')),
  status text default 'active' check (status in ('active','pending','banned')),
  xp integer default 0,
  joined_at timestamptz default now(),
  primary key (community_id, user_id)
);

create table if not exists community_channels (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  kind text not null,                             -- discussion|chat|announcements|resources|events|courses|live
  name text not null,
  position integer default 0,
  post_policy text default 'members' check (post_policy in ('members','mods'))
);

-- ============ Chat & feed ============
create table if not exists channel_messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references community_channels(id) on delete cascade,
  author_id uuid references profiles(id),
  body text,
  attachments jsonb default '[]'::jsonb,
  reply_to_id uuid references channel_messages(id),
  created_at timestamptz default now(),
  edited_at timestamptz
);

create table if not exists message_reactions (
  message_id uuid references channel_messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text,
  primary key (message_id, user_id, emoji)
);

create table if not exists channel_reads (
  channel_id uuid references community_channels(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (channel_id, user_id)
);

create table if not exists feed_posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references profiles(id),
  community_id uuid references communities(id),
  kind text default 'text',                       -- text|image|link|achievement
  body text,
  media jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists post_reactions (
  post_id uuid references feed_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text,
  primary key (post_id, user_id, emoji)
);

create table if not exists post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references feed_posts(id) on delete cascade,
  author_id uuid references profiles(id),
  body text,
  created_at timestamptz default now()
);

-- ============ Notifications ============
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  actor_id uuid references profiles(id),
  entity_type text,
  entity_id uuid,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists push_tokens (
  user_id uuid references profiles(id) on delete cascade,
  token text,
  platform text,
  created_at timestamptz default now(),
  primary key (user_id, token)
);

-- ============ Gamification ============
create table if not exists xp_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  community_id uuid references communities(id),
  source text,
  points integer default 0,
  created_at timestamptz default now()
);

create table if not exists streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_len integer default 0,
  longest_len integer default 0,
  last_active_date date
);

create table if not exists badges (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text,
  description text,
  criteria jsonb
);

create table if not exists user_badges (
  user_id uuid references profiles(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);

-- ============ Live sessions & Q&A ============
create table if not exists live_sessions (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  host_id uuid references profiles(id),
  title text,
  scheduled_at timestamptz,
  status text default 'scheduled',
  recording_url text,
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists live_questions (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references live_sessions(id) on delete cascade,
  author_id uuid references profiles(id),
  body text,
  votes integer default 0,
  status text default 'open' check (status in ('open','answered','pinned')),
  anonymous boolean default false,
  created_at timestamptz default now()
);

-- ============ AI (RAG) — Mentor Clone ============
create table if not exists ai_sources (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references profiles(id),
  community_id uuid references communities(id),
  type text,
  file_url text,
  status text default 'processing' check (status in ('processing','ready')),
  created_at timestamptz default now()
);

create table if not exists ai_chunks (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid references ai_sources(id) on delete cascade,
  content text,
  embedding vector(1536)
);

-- ============ RLS scaffolding ============
-- Enable RLS; policies to be added per the PRD's membership-scoped model
-- (central SECURITY DEFINER helpers is_community_member / is_community_mod).
alter table profiles            enable row level security;
alter table communities         enable row level security;
alter table community_members   enable row level security;
alter table community_channels  enable row level security;
alter table channel_messages    enable row level security;
alter table feed_posts          enable row level security;
alter table notifications       enable row level security;
alter table xp_events           enable row level security;
alter table live_sessions       enable row level security;
alter table ai_sources          enable row level security;

-- TODO: add membership-scoped policies + helper functions in 0002_rls_policies.sql
