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
      'resolve_report',
      'invite_user'
    )
  );
