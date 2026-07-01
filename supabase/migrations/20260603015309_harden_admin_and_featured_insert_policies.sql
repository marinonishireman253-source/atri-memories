-- Harden admin helpers and prevent direct client feature spoofing.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
revoke all on function public.is_admin() from authenticated;
grant execute on function public.is_admin() to anon, authenticated, service_role;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.is_admin(uuid) from anon;
revoke all on function public.is_admin(uuid) from authenticated;
grant execute on function public.is_admin(uuid) to service_role;

drop policy if exists "Users can read own profile and admins can read all" on public.user_profiles;
create policy "Users can read own profile and admins can read all"
  on public.user_profiles for select
  to authenticated
  using (user_id = auth.uid() or (select public.is_admin()));

drop policy if exists "Users can create own profile" on public.user_profiles;
create policy "Users can create own profile"
  on public.user_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
  on public.site_settings for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
  on public.admin_audit_logs for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can read memory reports" on public.memory_reports;
create policy "Admins can read memory reports"
  on public.memory_reports for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Anyone can read public memories" on public.memories;
create policy "Anyone can read public memories"
  on public.memories for select
  to anon, authenticated
  using (
    visibility_status = 'public'
    or owner_id = auth.uid()
    or (select public.is_admin())
  );

drop policy if exists "Users can add own memories" on public.memories;
create policy "Users can add own memories"
  on public.memories for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (select public.can_upload_memory(auth.uid()))
    and char_length(trim(title)) between 1 and 80
    and coalesce(is_featured, false) = false
    and storage_path like ('public/' || auth.uid()::text || '/%')
    and image_url like '%/storage/v1/object/public/atri-images/public/%'
  );

drop policy if exists "Users can update manageable memories" on public.memories;
create policy "Users can update manageable memories"
  on public.memories for update
  to authenticated
  using (owner_id = auth.uid() or (select public.is_admin()))
  with check (
    (owner_id = auth.uid() or (select public.is_admin()))
    and char_length(trim(title)) between 1 and 80
  );

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
          or (select public.is_admin())
        )
    )
  );

drop policy if exists "Users can delete own memory favorites" on public.memory_favorites;
create policy "Users can delete own memory favorites"
  on public.memory_favorites for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can view own ATRI images" on storage.objects;
create policy "Users can view own ATRI images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'atri-images'
    and (
      (select public.is_admin())
      or (
        (storage.foldername(name))[1] = 'public'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

drop policy if exists "Users can upload own ATRI images" on storage.objects;
create policy "Users can upload own ATRI images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'atri-images'
    and (select public.can_upload_memory(auth.uid()))
    and (storage.foldername(name))[1] = 'public'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

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
  caller_is_admin boolean := false;
  target_is_admin boolean := false;
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

  select exists (
    select 1
    from public.admin_users
    where user_id = caller_id
  )
    into caller_is_admin;

  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
  )
    into target_is_admin;

  if caller_id is not null
     and caller_id <> check_user_id
     and not caller_is_admin then
    raise exception 'Forbidden'
      using errcode = '42501';
  end if;

  return query
  with setting_rows as (
    select
      bool_or(case when key = 'uploads_enabled' then (value #>> '{}')::boolean end) as uploads_enabled_value,
      max(case when key = 'upload_hour_limit' then (value #>> '{}')::integer end) as upload_hour_limit_value,
      max(case when key = 'upload_day_limit' then (value #>> '{}')::integer end) as upload_day_limit_value
    from public.site_settings
    where key in ('uploads_enabled', 'upload_hour_limit', 'upload_day_limit')
  ),
  profile_row as (
    select
      p.can_upload as user_can_upload,
      p.upload_limit_total as user_upload_limit_total
    from public.user_profiles p
    where p.user_id = check_user_id
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
    target_is_admin as is_admin,
    coalesce(profile_row.user_can_upload, true) as can_upload,
    profile_row.user_upload_limit_total,
    memory_counts.upload_count,
    setting_rows.upload_hour_limit_value as upload_hour_limit,
    memory_counts.upload_hour_count,
    setting_rows.upload_day_limit_value as upload_day_limit,
    memory_counts.upload_day_count,
    (
      (coalesce(setting_rows.uploads_enabled_value, true) or target_is_admin)
      and coalesce(profile_row.user_can_upload, true)
      and (
        profile_row.user_upload_limit_total is null
        or memory_counts.upload_count < profile_row.user_upload_limit_total
      )
      and (
        target_is_admin
        or setting_rows.upload_hour_limit_value is null
        or memory_counts.upload_hour_count < setting_rows.upload_hour_limit_value
      )
      and (
        target_is_admin
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
revoke all on function public.upload_policy_state(uuid) from anon;
grant execute on function public.upload_policy_state(uuid) to authenticated;
grant execute on function public.upload_policy_state(uuid) to service_role;

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
revoke all on function public.can_upload_memory(uuid) from anon;
grant execute on function public.can_upload_memory(uuid) to authenticated;
grant execute on function public.can_upload_memory(uuid) to service_role;

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
  caller_is_admin boolean := false;
  target_is_admin boolean := false;
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

  select exists (
    select 1
    from public.admin_users
    where user_id = caller_id
  )
    into caller_is_admin;

  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
  )
    into target_is_admin;

  if caller_id is not null
     and caller_id <> check_user_id
     and not caller_is_admin then
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
    target_is_admin as is_admin,
    setting_rows.invite_hour_limit_value as invite_hour_limit,
    invite_counts.invite_hour_count,
    setting_rows.invite_day_limit_value as invite_day_limit,
    invite_counts.invite_day_count,
    (
      target_is_admin
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
revoke all on function public.admin_invite_policy_state(uuid) from anon;
revoke all on function public.admin_invite_policy_state(uuid) from authenticated;
grant execute on function public.admin_invite_policy_state(uuid) to authenticated;
grant execute on function public.admin_invite_policy_state(uuid) to service_role;
