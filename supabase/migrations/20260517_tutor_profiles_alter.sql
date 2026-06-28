-- =============================================================================
-- Migration: Add missing columns to existing tutor_profiles table
-- Run this in Supabase SQL Editor if the table already exists
-- =============================================================================

do $$
begin

  -- Core profile columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='tagline') then
    alter table public.tutor_profiles add column tagline text not null default '';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='bio') then
    alter table public.tutor_profiles add column bio text not null default '';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='qualifications') then
    alter table public.tutor_profiles add column qualifications text not null default '';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='experience_years') then
    alter table public.tutor_profiles add column experience_years int not null default 1;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='phone') then
    alter table public.tutor_profiles add column phone text not null default '';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='location') then
    alter table public.tutor_profiles add column location text not null default '';
  end if;

  -- Teaching metadata (array columns — most likely missing)
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='subjects') then
    alter table public.tutor_profiles add column subjects text[] not null default '{}';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='boards') then
    alter table public.tutor_profiles add column boards text[] not null default '{}';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='grades') then
    alter table public.tutor_profiles add column grades text[] not null default '{}';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='languages') then
    alter table public.tutor_profiles add column languages text[] not null default '{"English"}';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='mode') then
    alter table public.tutor_profiles add column mode text not null default 'both';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='hourly_rate') then
    alter table public.tutor_profiles add column hourly_rate int not null default 500;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='availability') then
    alter table public.tutor_profiles add column availability jsonb not null default '{}';
  end if;

  -- Approval flow columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='status') then
    alter table public.tutor_profiles add column status text not null default 'DRAFT';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='rejection_reason') then
    alter table public.tutor_profiles add column rejection_reason text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='submitted_at') then
    alter table public.tutor_profiles add column submitted_at timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='approved_at') then
    alter table public.tutor_profiles add column approved_at timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='is_active') then
    alter table public.tutor_profiles add column is_active boolean not null default false;
  end if;

  -- Verification document columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='profile_photo_url') then
    alter table public.tutor_profiles add column profile_photo_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='certificate_urls') then
    alter table public.tutor_profiles add column certificate_urls text[] not null default '{}';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='id_proof_url') then
    alter table public.tutor_profiles add column id_proof_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='id_proof_type') then
    alter table public.tutor_profiles add column id_proof_type text;
  end if;

  -- Stats columns
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='total_students') then
    alter table public.tutor_profiles add column total_students int not null default 0;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='total_sessions') then
    alter table public.tutor_profiles add column total_sessions int not null default 0;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='avg_rating') then
    alter table public.tutor_profiles add column avg_rating numeric(3,2) not null default 0;
  end if;

  -- Timestamps
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='updated_at') then
    alter table public.tutor_profiles add column updated_at timestamptz not null default now();
  end if;

  -- If old table had aspirant_id FK instead of user_id, rename it
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='aspirant_id')
  and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tutor_profiles' and column_name='user_id') then
    alter table public.tutor_profiles rename column aspirant_id to user_id;
  end if;

end $$;

-- Add user_id column if it's missing entirely (separate statement outside DO block)
alter table public.tutor_profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Reload PostgREST schema cache so the new columns are immediately visible
notify pgrst, 'reload schema';
