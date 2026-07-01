-- Lightweight tagging for memory categorization and filtering.

alter table public.memories
  add column if not exists tags text[] not null default '{}';

update public.memories
set tags = '{}'
where tags is null;

create index if not exists memories_tags_idx
  on public.memories using gin (tags);
