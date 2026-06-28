-- =============================================================================
-- Migration: tutor_profiles table + Storage bucket
-- Run this in Supabase SQL Editor or via supabase db push
-- =============================================================================

-- ── 1. tutor_profiles table ───────────────────────────────────────────────────
create table if not exists public.tutor_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- Profile info
  display_name      text not null default '',
  tagline           text not null default '',
  bio               text not null default '',
  qualifications    text not null default '',
  experience_years  int  not null default 1 check (experience_years >= 0 and experience_years <= 60),
  phone             text not null default '',
  location          text not null default '',

  -- Teaching metadata
  subjects          text[]  not null default '{}',
  boards            text[]  not null default '{}',
  grades            text[]  not null default '{}',
  languages         text[]  not null default '{"English"}',
  mode              text    not null default 'both' check (mode in ('online','offline','both')),
  hourly_rate       int     not null default 500 check (hourly_rate >= 0),
  availability      jsonb   not null default '{}',

  -- Approval flow
  status            text    not null default 'DRAFT'
                    check (status in ('DRAFT','PENDING','APPROVED','REJECTED','SUSPENDED')),
  rejection_reason  text,
  submitted_at      timestamptz,
  approved_at       timestamptz,
  is_active         boolean not null default false,

  -- Verification documents (stored in Supabase Storage bucket: tutor-docs)
  profile_photo_url text,
  certificate_urls  text[]  not null default '{}',
  id_proof_url      text,
  id_proof_type     text    check (id_proof_type in (
                      'Aadhaar Card','PAN Card','Passport','Voter ID','Driving License', null
                    )),

  -- Stats (updated by backend/triggers)
  total_students    int not null default 0,
  total_sessions    int not null default 0,
  avg_rating        numeric(3,2) not null default 0,

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- One profile per teacher
  unique (user_id)
);

-- Index for fast lookup
create index if not exists tutor_profiles_status_idx       on public.tutor_profiles(status);
create index if not exists tutor_profiles_is_active_idx    on public.tutor_profiles(is_active);
create index if not exists tutor_profiles_user_id_idx      on public.tutor_profiles(user_id);

-- ── 2. updated_at auto-update trigger ────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tutor_profiles_updated_at on public.tutor_profiles;
create trigger tutor_profiles_updated_at
  before update on public.tutor_profiles
  for each row execute function public.set_updated_at();

-- ── 3. Row Level Security ─────────────────────────────────────────────────────
alter table public.tutor_profiles enable row level security;

-- Teacher: full access to their own profile only
create policy "teacher_own_profile_all" on public.tutor_profiles
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- CMS staff/admin: can read all non-DRAFT profiles
create policy "cms_read_submitted_profiles" on public.tutor_profiles
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('CMS_ADMIN', 'CMS_STAFF')
    )
    and status <> 'DRAFT'
  );

-- CMS admin only: can update status (approve/reject/suspend)
create policy "cms_admin_update_status" on public.tutor_profiles
  for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'CMS_ADMIN'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'CMS_ADMIN'
    )
  );

-- Students / public: can read APPROVED + active profiles
create policy "public_read_approved_active" on public.tutor_profiles
  for select
  using (status = 'APPROVED' and is_active = true);

-- School admins: explicitly DENY — no policy grants them access
-- (absence of a matching policy = no access under RLS)

-- ── 4. Supabase Storage bucket: tutor-docs ────────────────────────────────────
-- Run this block in the SQL editor (storage schema must be available)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutor-docs',
  'tutor-docs',
  false,   -- private bucket — access via signed URLs or service role
  5242880, -- 5 MB max per file
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

-- Storage RLS: teacher can upload/read/delete their own folder
create policy "teacher_upload_own_docs" on storage.objects
  for insert
  with check (
    bucket_id = 'tutor-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "teacher_read_own_docs" on storage.objects
  for select
  using (
    bucket_id = 'tutor-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "teacher_delete_own_docs" on storage.objects
  for delete
  using (
    bucket_id = 'tutor-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- CMS admin can read any file in the bucket for verification
create policy "cms_admin_read_all_docs" on storage.objects
  for select
  using (
    bucket_id = 'tutor-docs'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'CMS_ADMIN'
    )
  );

-- ── 5. If upgrading existing table: add missing columns ───────────────────────
-- (Safe to run even if columns already exist — uses IF NOT EXISTS)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name='tutor_profiles' and column_name='profile_photo_url') then
    alter table public.tutor_profiles add column profile_photo_url text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_name='tutor_profiles' and column_name='certificate_urls') then
    alter table public.tutor_profiles add column certificate_urls text[] not null default '{}';
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_name='tutor_profiles' and column_name='id_proof_url') then
    alter table public.tutor_profiles add column id_proof_url text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_name='tutor_profiles' and column_name='id_proof_type') then
    alter table public.tutor_profiles add column id_proof_type text;
  end if;

  -- If old table used aspirant_id instead of user_id, rename it
  if exists (select 1 from information_schema.columns
             where table_name='tutor_profiles' and column_name='aspirant_id') then
    alter table public.tutor_profiles rename column aspirant_id to user_id;
  end if;
end $$;
