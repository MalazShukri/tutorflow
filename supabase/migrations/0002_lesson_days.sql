-- Adds the weekly lesson days to students (for projects created before this column existed).
-- Safe to run more than once.
alter table public.students
  add column if not exists lesson_days smallint[] not null default '{}'
  check (lesson_days <@ array[0,1,2,3,4,5,6]::smallint[]);
