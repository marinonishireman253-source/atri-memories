-- Supabase may apply extra default function grants to anon/authenticated roles.
-- Explicitly revoke anonymous access from upload policy helpers and keep them
-- available only to authenticated upload flows and service-side maintenance.

revoke all on function public.upload_policy_state(uuid) from public;
revoke all on function public.upload_policy_state(uuid) from anon;
grant execute on function public.upload_policy_state(uuid) to authenticated;
grant execute on function public.upload_policy_state(uuid) to service_role;

revoke all on function public.can_upload_memory(uuid) from public;
revoke all on function public.can_upload_memory(uuid) from anon;
grant execute on function public.can_upload_memory(uuid) to authenticated;
grant execute on function public.can_upload_memory(uuid) to service_role;
