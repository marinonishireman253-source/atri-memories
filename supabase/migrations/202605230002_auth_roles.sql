-- User/admin permission model for ATRI Memories.
-- Visitors can browse. Authenticated users can upload and manage their own images.
-- Admins listed in public.admin_users can manage every image, including legacy rows.

alter table public.memories
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists owner_email text;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

drop policy if exists "Users can view their own admin status" on public.admin_users;
create policy "Users can view their own admin status"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Anyone can read public memories" on public.memories;
create policy "Anyone can read public memories"
  on public.memories for select
  to anon, authenticated
  using (true);

drop policy if exists "Visitors can add public memories" on public.memories;
drop policy if exists "Users can add own memories" on public.memories;
create policy "Users can add own memories"
  on public.memories for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and char_length(trim(title)) between 1 and 80
    and storage_path like ('public/' || auth.uid()::text || '/%')
    and image_url like '%/storage/v1/object/public/atri-images/public/%'
  );

drop policy if exists "Users can update manageable memories" on public.memories;
create policy "Users can update manageable memories"
  on public.memories for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (
    (owner_id = auth.uid() or public.is_admin(auth.uid()))
    and char_length(trim(title)) between 1 and 80
  );

drop policy if exists "Visitors can upload ATRI images" on storage.objects;
drop policy if exists "Users can upload own ATRI images" on storage.objects;
create policy "Users can upload own ATRI images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'atri-images'
    and (storage.foldername(name))[1] = 'public'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
