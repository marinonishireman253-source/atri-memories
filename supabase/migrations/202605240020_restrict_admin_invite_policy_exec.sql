-- Ensure anonymous callers cannot probe admin invite policy state.

revoke all on function public.admin_invite_policy_state(uuid) from public;
revoke all on function public.admin_invite_policy_state(uuid) from anon;
revoke all on function public.admin_invite_policy_state(uuid) from authenticated;

grant execute on function public.admin_invite_policy_state(uuid) to authenticated;
grant execute on function public.admin_invite_policy_state(uuid) to service_role;
