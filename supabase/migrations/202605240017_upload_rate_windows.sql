-- Site-level upload rate windows for ordinary users.

insert into public.site_settings (key, value)
values
  ('upload_hour_limit', 'null'::jsonb),
  ('upload_day_limit', 'null'::jsonb)
on conflict (key) do nothing;

create or replace function public.upload_policy_state(check_user_id uuid)
returns table (
  uploads_enabled boolean,
  is_admin boolean,
  can_upload boolean,
  upload_limit_total integer,
  upload_count integer,
  upload_hour_limit integer,
  upload_hour_count integer,
  upload_day_limit integer,
  upload_day_count integer,
  allows_upload boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  caller_id uuid := auth.uid();
  profile_can_upload boolean;
begin
  if check_user_id is null then
    return query
    select
      true,
      false,
      false,
      null::integer,
      0,
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
      max(case when key = 'uploads_enabled' then (value #>> '{}')::boolean end) as uploads_enabled_value,
      max(case when key = 'upload_hour_limit' then (value #>> '{}')::integer end) as upload_hour_limit_value,
      max(case when key = 'upload_day_limit' then (value #>> '{}')::integer end) as upload_day_limit_value
    from public.site_settings
    where key in ('uploads_enabled', 'upload_hour_limit', 'upload_day_limit')
  ),
  profile_row as (
    select
      can_upload,
      upload_limit_total
    from public.user_profiles
    where user_id = check_user_id
  ),
  memory_counts as (
    select
      count(*)::integer as upload_count,
      (count(*) filter (where created_at >= now() - interval '1 hour'))::integer as upload_hour_count,
      (count(*) filter (where created_at >= now() - interval '1 day'))::integer as upload_day_count
    from public.memories
    where owner_id = check_user_id
  )
  select
    coalesce(setting_rows.uploads_enabled_value, true) as uploads_enabled,
    public.is_admin(check_user_id) as is_admin,
    coalesce(profile_row.can_upload, true) as can_upload,
    profile_row.upload_limit_total,
    memory_counts.upload_count,
    setting_rows.upload_hour_limit_value as upload_hour_limit,
    memory_counts.upload_hour_count,
    setting_rows.upload_day_limit_value as upload_day_limit,
    memory_counts.upload_day_count,
    (
      (coalesce(setting_rows.uploads_enabled_value, true) or public.is_admin(check_user_id))
      and coalesce(profile_row.can_upload, true)
      and (
        profile_row.upload_limit_total is null
        or memory_counts.upload_count < profile_row.upload_limit_total
      )
      and (
        public.is_admin(check_user_id)
        or setting_rows.upload_hour_limit_value is null
        or memory_counts.upload_hour_count < setting_rows.upload_hour_limit_value
      )
      and (
        public.is_admin(check_user_id)
        or setting_rows.upload_day_limit_value is null
        or memory_counts.upload_day_count < setting_rows.upload_day_limit_value
      )
    ) as allows_upload
  from setting_rows
  cross join memory_counts
  left join profile_row on true;
end;
$$;

revoke all on function public.upload_policy_state(uuid) from public;
grant execute on function public.upload_policy_state(uuid) to authenticated;

create or replace function public.can_upload_memory(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  policy record;
begin
  select *
    into policy
  from public.upload_policy_state(check_user_id);

  return coalesce(policy.allows_upload, false);
end;
$$;

revoke all on function public.can_upload_memory(uuid) from public;
grant execute on function public.can_upload_memory(uuid) to authenticated;
