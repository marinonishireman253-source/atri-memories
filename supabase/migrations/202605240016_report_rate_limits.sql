-- Add reporter fingerprinting and duplicate-open protection for report abuse mitigation.

alter table public.memory_reports
  add column if not exists reporter_fingerprint text;

update public.memory_reports
set reporter_fingerprint = case
  when reporter_user_id is not null then 'user:' || reporter_user_id::text
  else 'legacy:' || id::text
end
where reporter_fingerprint is null or reporter_fingerprint = '';

alter table public.memory_reports
  alter column reporter_fingerprint set not null;

create index if not exists memory_reports_reporter_fingerprint_created_at_idx
  on public.memory_reports (reporter_fingerprint, created_at desc);

create unique index if not exists memory_reports_open_reporter_memory_key
  on public.memory_reports (memory_id, reporter_fingerprint)
  where status = 'open';
