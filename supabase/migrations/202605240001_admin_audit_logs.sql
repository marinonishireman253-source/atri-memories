-- Audit log for privileged and content-changing actions.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null check (
    action in (
      'delete_memory',
      'update_memory',
      'grant_admin',
      'revoke_admin'
    )
  ),
  target_type text not null check (target_type in ('memory', 'user')),
  target_id text not null,
  target_label text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs (actor_user_id, created_at desc);

create index if not exists admin_audit_logs_action_idx
  on public.admin_audit_logs (action, created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
  on public.admin_audit_logs for select
  to authenticated
  using (public.is_admin(auth.uid()));
