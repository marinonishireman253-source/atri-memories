-- Admin-scale gallery management helpers.

alter table public.memories
  add column if not exists file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0);

create index if not exists memories_owner_created_at_idx
  on public.memories (owner_id, created_at desc);

create index if not exists memories_file_size_idx
  on public.memories (file_size_bytes);
