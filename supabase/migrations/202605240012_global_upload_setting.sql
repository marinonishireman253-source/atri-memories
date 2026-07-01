-- Global upload switch for ordinary users. Admins can still upload for maintenance.

insert into public.site_settings (key, value)
values ('uploads_enabled', 'true'::jsonb)
on conflict (key) do nothing;

create or replace function public.can_upload_memory(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uploads_enabled boolean := true;
  profile_can_upload boolean;
  profile_upload_limit_total integer;
  current_upload_count integer;
begin
  if check_user_id is null then
    return false;
  end if;

  select (value #>> '{}')::boolean
    into uploads_enabled
  from public.site_settings
  where key = 'uploads_enabled';
  uploads_enabled := coalesce(uploads_enabled, true);

  if uploads_enabled is false and not public.is_admin(check_user_id) then
    return false;
  end if;

  select can_upload, upload_limit_total
    into profile_can_upload, profile_upload_limit_total
  from public.user_profiles
  where user_id = check_user_id;

  if profile_can_upload is false then
    return false;
  end if;

  if profile_upload_limit_total is not null then
    select count(*)::integer
      into current_upload_count
    from public.memories
    where owner_id = check_user_id;

    if current_upload_count >= profile_upload_limit_total then
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.can_upload_memory(uuid) from public;
grant execute on function public.can_upload_memory(uuid) to authenticated;
