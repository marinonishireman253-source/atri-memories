-- User profile extension point for personal gallery features.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 40),
  bio text check (bio is null or char_length(bio) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile and admins can read all" on public.user_profiles;
create policy "Users can read own profile and admins can read all"
  on public.user_profiles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Users can create own profile" on public.user_profiles;
create policy "Users can create own profile"
  on public.user_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
