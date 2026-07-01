-- Content governance: allow admins to hide memories without deleting files.

alter table public.memories
  add column if not exists visibility_status text not null default 'public'
  check (visibility_status in ('public', 'hidden'));

create index if not exists memories_visibility_created_at_idx
  on public.memories (visibility_status, created_at desc);

update public.memories
set visibility_status = 'public'
where visibility_status is null;

drop policy if exists "Anyone can read public memories" on public.memories;
create policy "Anyone can read public memories"
  on public.memories for select
  to anon, authenticated
  using (
    visibility_status = 'public'
    or owner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

update public.memories
set is_featured = false
where visibility_status <> 'public'
  and is_featured = true;
