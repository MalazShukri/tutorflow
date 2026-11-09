-- Adds an optional from/to time for each lesson day. Safe to run more than once.
alter table public.students
  add column if not exists lesson_times jsonb not null default '{}'
  check (jsonb_typeof(lesson_times) = 'object');
