-- Public gallery schema for ATRI Memories.
-- Anonymous uploads suit a shared public demo only. Require authentication
-- before using this policy set for a private or heavily promoted site.

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 80),
  caption text check (caption is null or char_length(caption) <= 280),
  image_url text not null check (
    image_url like '%/storage/v1/object/public/atri-images/public/%'
  ),
  storage_path text not null check (storage_path like 'public/%'),
  created_at timestamptz not null default now()
);

create index if not exists memories_created_at_idx
  on public.memories (created_at desc);

alter table public.memories enable row level security;

drop policy if exists "Anyone can read public memories" on public.memories;
create policy "Anyone can read public memories"
  on public.memories for select
  to anon, authenticated
  using (true);

drop policy if exists "Visitors can add public memories" on public.memories;
create policy "Visitors can add public memories"
  on public.memories for insert
  to anon, authenticated
  with check (
    char_length(trim(title)) between 1 and 80
    and storage_path like 'public/%'
    and image_url like '%/storage/v1/object/public/atri-images/public/%'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'atri-images',
  'atri-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view ATRI images" on storage.objects;
create policy "Anyone can view ATRI images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'atri-images');

drop policy if exists "Visitors can upload ATRI images" on storage.objects;
create policy "Visitors can upload ATRI images"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'atri-images'
    and (storage.foldername(name))[1] = 'public'
  );
