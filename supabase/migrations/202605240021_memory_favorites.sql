-- Personal favorites for logged-in users.

create table if not exists public.memory_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, memory_id)
);

create index if not exists memory_favorites_user_created_at_idx
  on public.memory_favorites (user_id, created_at desc);

create index if not exists memory_favorites_memory_id_idx
  on public.memory_favorites (memory_id, created_at desc);

alter table public.memory_favorites enable row level security;

drop policy if exists "Users can read own memory favorites" on public.memory_favorites;
create policy "Users can read own memory favorites"
  on public.memory_favorites for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can add own memory favorites" on public.memory_favorites;
create policy "Users can add own memory favorites"
  on public.memory_favorites for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.memories
      where memories.id = memory_id
        and (
          memories.visibility_status = 'public'
          or memories.owner_id = auth.uid()
          or public.is_admin(auth.uid())
        )
    )
  );

drop policy if exists "Users can delete own memory favorites" on public.memory_favorites;
create policy "Users can delete own memory favorites"
  on public.memory_favorites for delete
  to authenticated
  using (user_id = auth.uid());
