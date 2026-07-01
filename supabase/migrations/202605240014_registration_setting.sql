-- Global setting for whether public self-service registration is allowed.

insert into public.site_settings (key, value)
values ('registrations_enabled', 'true'::jsonb)
on conflict (key) do nothing;
