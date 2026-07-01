-- Site-level invite rate windows for admin-issued account invitations.

insert into public.site_settings (key, value)
values
  ('invite_hour_limit', 'null'::jsonb),
  ('invite_day_limit', 'null'::jsonb)
on conflict (key) do nothing;

create or replace function public.admin_invite_policy_state(check_user_id uuid)
returns table (
  is_admin boolean,
  invite_hour_limit integer,
  invite_hour_count integer,
  invite_day_limit integer,
  invite_day_count integer,
  allows_invite boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  caller_id uuid := auth.uid();
begin
  if check_user_id is null then
    return query
    select
      false,
      null::integer,
      0,
      null::integer,
      0,
      false;
    return;
  end if;

  if caller_id is not null
     and caller_id <> check_user_id
     and not public.is_admin(caller_id) then
    raise exception 'Forbidden'
      using errcode = '42501';
  end if;

  return query
  with setting_rows as (
    select
      max(case when key = 'invite_hour_limit' then (value #>> '{}')::integer end) as invite_hour_limit_value,
      max(case when key = 'invite_day_limit' then (value #>> '{}')::integer end) as invite_day_limit_value
    from public.site_settings
    where key in ('invite_hour_limit', 'invite_day_limit')
  ),
  invite_counts as (
    select
      (count(*) filter (
        where action = 'invite_user'
          and actor_user_id = check_user_id
          and created_at >= now() - interval '1 hour'
      ))::integer as invite_hour_count,
      (count(*) filter (
        where action = 'invite_user'
          and actor_user_id = check_user_id
          and created_at >= now() - interval '1 day'
      ))::integer as invite_day_count
    from public.admin_audit_logs
  )
  select
    public.is_admin(check_user_id) as is_admin,
    setting_rows.invite_hour_limit_value as invite_hour_limit,
    invite_counts.invite_hour_count,
    setting_rows.invite_day_limit_value as invite_day_limit,
    invite_counts.invite_day_count,
    (
      public.is_admin(check_user_id)
      and (
        setting_rows.invite_hour_limit_value is null
        or invite_counts.invite_hour_count < setting_rows.invite_hour_limit_value
      )
      and (
        setting_rows.invite_day_limit_value is null
        or invite_counts.invite_day_count < setting_rows.invite_day_limit_value
      )
    ) as allows_invite
  from setting_rows
  cross join invite_counts;
end;
$$;

revoke all on function public.admin_invite_policy_state(uuid) from public;
grant execute on function public.admin_invite_policy_state(uuid) to authenticated;
grant execute on function public.admin_invite_policy_state(uuid) to service_role;
