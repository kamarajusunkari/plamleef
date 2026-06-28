-- ============================================================
-- EduBattle — Supabase Database Schema
-- Run this in: supabase.com → your project → SQL Editor
-- ============================================================

-- ── Enums ─────────────────────────────────────────────────────────────────
create type user_role       as enum ('STUDENT', 'TEACHER', 'PARENT', 'SCHOOL_ADMIN', 'CMS_ADMIN');
create type assignment_mode as enum ('HOMEWORK', 'GAME', 'COMPETITION');
create type assign_status   as enum ('PENDING', 'COMPLETED', 'OVERDUE');
create type difficulty      as enum ('EASY', 'MEDIUM', 'HARD');
create type resource_type   as enum ('PDF', 'VIDEO', 'FLASHCARD', 'IMAGE');
create type resource_level  as enum ('STARTER', 'INTERMEDIATE', 'ADVANCED', 'PRO');
create type resource_source as enum ('SCHOOL', 'EDUBATTLE');
create type doubt_status    as enum ('OPEN', 'ANSWERED');
create type badge_rarity    as enum ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- ── Schools ────────────────────────────────────────────────────────────────
create table schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text unique not null,          -- e.g. "DPS-VJA"
  city        text,
  state       text,
  created_at  timestamptz default now()
);

-- ── Users (extends Supabase auth.users) ───────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  school_id   uuid references schools,
  role        user_role not null,
  name        text not null,
  email       text not null,
  initials    text,
  color       text default '#3B82F6',
  avatar_url  text,
  created_at  timestamptz default now()
);

-- ── Classes ────────────────────────────────────────────────────────────────
create table classes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid references schools not null,
  name        text not null,               -- "Grade 8-A"
  section     text,
  grade       int,
  created_at  timestamptz default now()
);

-- ── Student profiles (extends profiles) ───────────────────────────────────
create table students (
  id          uuid primary key references profiles,
  class_id    uuid references classes,
  roll_no     text,
  xp          int default 0,
  level       int default 1,
  streak      int default 0,
  rank        int,
  attendance  numeric(5,2) default 100
);

-- ── Teacher profiles ───────────────────────────────────────────────────────
create table teachers (
  id          uuid primary key references profiles,
  subjects    text[],                        -- ["Mathematics", "Science"]
  designation text
);

-- ── Subjects ───────────────────────────────────────────────────────────────
create table subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text default '#3B82F6',
  icon        text
);

-- ── Teacher ↔ Class ↔ Subject assignments ─────────────────────────────────
create table teacher_classes (
  teacher_id  uuid references teachers not null,
  class_id    uuid references classes not null,
  subject_id  uuid references subjects not null,
  primary key (teacher_id, class_id, subject_id)
);

-- ── Quiz Questions ─────────────────────────────────────────────────────────
create table questions (
  id             uuid primary key default gen_random_uuid(),
  subject_id     uuid references subjects,
  topic          text not null,
  text           text not null,
  options        jsonb not null,              -- ["A","B","C","D"]
  correct        int not null,                -- 0-based index
  explanation    text,
  ai_explanation text,
  difficulty     difficulty default 'MEDIUM',
  created_by     uuid references profiles,
  created_at     timestamptz default now()
);

-- ── Assignments ────────────────────────────────────────────────────────────
create table assignments (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  teacher_id   uuid references teachers not null,
  class_id     uuid references classes not null,
  subject_id   uuid references subjects not null,
  mode         assignment_mode default 'HOMEWORK',
  difficulty   difficulty default 'MEDIUM',
  due_date     timestamptz,
  xp_reward    int default 50,
  question_ids uuid[],                        -- ordered list of question IDs
  time_per_q   int default 30,               -- seconds per question
  is_urgent    boolean default false,
  created_at   timestamptz default now()
);

-- ── Assignment submissions (student results) ───────────────────────────────
create table submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid references assignments not null,
  student_id      uuid references students not null,
  status          assign_status default 'PENDING',
  score           numeric(5,2),              -- percentage 0-100
  xp_earned       int default 0,
  answers         jsonb,                     -- {"q-uuid": selected_index, ...}
  submitted_at    timestamptz,
  unique (assignment_id, student_id)
);

-- ── Badges ─────────────────────────────────────────────────────────────────
create table badges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text,
  description text,
  rarity      badge_rarity default 'COMMON',
  xp_reward   int default 10
);

create table student_badges (
  student_id  uuid references students not null,
  badge_id    uuid references badges not null,
  earned_at   timestamptz default now(),
  primary key (student_id, badge_id)
);

-- ── Resources ──────────────────────────────────────────────────────────────
create table resources (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subject_id   uuid references subjects,
  type         resource_type not null,
  level        resource_level default 'INTERMEDIATE',
  source       resource_source default 'SCHOOL',
  school_id    uuid references schools,       -- null if source = EDUBATTLE
  uploaded_by  uuid references profiles,
  file_url     text,
  duration     text,                          -- "14:32" for videos
  pages        int,
  size_mb      numeric(8,2),
  views        int default 0,
  tags         text[],
  color        text default '#3B82F6',
  created_at   timestamptz default now()
);

create table student_saved_resources (
  student_id   uuid references students not null,
  resource_id  uuid references resources not null,
  saved_at     timestamptz default now(),
  primary key (student_id, resource_id)
);

-- ── Doubts ─────────────────────────────────────────────────────────────────
create table doubts (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references students not null,
  teacher_id   uuid references teachers,
  subject_id   uuid references subjects,
  topic        text,
  question     text not null,
  answer       text,
  ai_draft     text,
  status       doubt_status default 'OPEN',
  created_at   timestamptz default now(),
  answered_at  timestamptz
);

-- ── Announcements ──────────────────────────────────────────────────────────
create table announcements (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid references schools not null,
  author_id    uuid references profiles,
  title        text not null,
  body         text,
  type         text default 'GENERAL',       -- EXAM, EVENT, GENERAL, URGENT
  target_class uuid references classes,       -- null = all classes
  scheduled_at timestamptz,
  created_at   timestamptz default now()
);

-- ── XP history (for charts) ────────────────────────────────────────────────
create table xp_events (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references students not null,
  xp           int not null,
  source       text,                          -- "QUIZ", "GAME", "BADGE"
  ref_id       uuid,                          -- submission/game id
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security — enable on all tables
-- ============================================================
alter table profiles              enable row level security;
alter table students              enable row level security;
alter table teachers              enable row level security;
alter table assignments           enable row level security;
alter table submissions           enable row level security;
alter table resources             enable row level security;
alter table student_saved_resources enable row level security;
alter table doubts                enable row level security;
alter table announcements         enable row level security;
alter table xp_events             enable row level security;

-- Example RLS: students can only see their own submissions
create policy "student sees own submissions"
  on submissions for select
  using (student_id = auth.uid());

-- Students can insert their own submissions
create policy "student submits"
  on submissions for insert
  with check (student_id = auth.uid());

-- Students can see all resources
create policy "students can read resources"
  on resources for select
  using (true);

-- Students can read their own profile
create policy "read own profile"
  on profiles for select
  using (id = auth.uid());

-- ============================================================
-- Done! Add more RLS policies per your auth requirements.
-- ============================================================
