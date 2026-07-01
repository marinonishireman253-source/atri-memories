-- Public reporting workflow for content governance.

create table if not exists public.memory_reports (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reporter_email text,
  reason text not null check (
    reason in ('inappropriate', 'copyright', 'privacy', 'spam', 'other')
  ),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'open' check (
    status in ('open', 'resolved', 'dismissed')
  ),
  resolution_note text check (
    resolution_note is null or char_length(resolution_note) <= 500
  ),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists memory_reports_status_created_at_idx
  on public.memory_reports (status, created_at desc);

create index if not exists memory_reports_memory_id_idx
  on public.memory_reports (memory_id, created_at desc);

alter table public.memory_reports enable row level security;

drop policy if exists "Admins can read memory reports" on public.memory_reports;
create policy "Admins can read memory reports"
  on public.memory_reports for select
  to authenticated
  using (public.is_admin(auth.uid()));

alter table public.admin_audit_logs
  drop constraint if exists admin_audit_logs_action_check;

alter table public.admin_audit_logs
  add constraint admin_audit_logs_action_check check (
    action in (
      'delete_memory',
      'update_memory',
      'grant_admin',
      'revoke_admin',
      'update_user_upload_policy',
      'resolve_report'
    )
  );
