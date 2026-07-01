-- Configurable batch upload count for the public upload dialog.

insert into public.site_settings (key, value)
values ('upload_batch_max', '30'::jsonb)
on conflict (key) do nothing;
