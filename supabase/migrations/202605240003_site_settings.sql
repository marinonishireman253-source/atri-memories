-- Site-level configuration for gallery behavior.

create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,64}$'),
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
  on public.site_settings for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

insert into public.site_settings (key, value)
values
  ('tag_presets', '["ATRI", "背景", "立绘", "截图", "生成图", "收藏"]'::jsonb),
  ('upload_max_mb', '8'::jsonb)
on conflict (key) do nothing;
