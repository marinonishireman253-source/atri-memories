-- Public showcase support for featured memories.

alter table public.memories
  add column if not exists is_featured boolean not null default false;

create index if not exists memories_featured_created_at_idx
  on public.memories (is_featured, created_at desc);
