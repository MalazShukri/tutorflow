-- TutorFlow (مُعلّمي) database schema
-- Run once in the Supabase SQL editor (or with `supabase db push`).
-- Every row belongs to the authenticated teacher (owner_id) and is protected by RLS.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.grades (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, name)
);

-- At most one default subject per teacher (preselected in the student and lesson forms).
create unique index subjects_one_default on public.subjects (owner_id) where is_default;

create table public.students (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (length(trim(name)) between 1 and 120),
  grade           text check (grade is null or length(grade) <= 60),
  address         text check (address is null or length(address) <= 300),
  guardian_phone  text check (guardian_phone is null or guardian_phone ~ '^[0-9+()\-\s]{4,25}$'),
  notes           text check (notes is null or length(notes) <= 2000),
  -- Weekdays with a private lesson: 0 = Sunday … 6 = Saturday.
  lesson_days     smallint[] not null default '{}' check (lesson_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  -- Optional time per lesson day: {"1": {"from": "16:00", "to": "17:30"}, ...}
  lesson_times    jsonb not null default '{}' check (jsonb_typeof(lesson_times) = 'object'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One row per (student, subject): holds that subject's independent progress.
create table public.student_subjects (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id            uuid not null references public.students (id) on delete cascade,
  subject_id            uuid not null references public.subjects (id) on delete restrict,
  current_chapter       text check (current_chapter is null or length(current_chapter) <= 200),
  last_completed_topic  text check (last_completed_topic is null or length(last_completed_topic) <= 300),
  next_topic            text check (next_topic is null or length(next_topic) <= 300),
  progress_notes        text check (progress_notes is null or length(progress_notes) <= 2000),
  last_lesson_date      date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (student_id, subject_id)
);

create table public.lessons (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id          uuid not null references public.students (id) on delete cascade,
  student_subject_id  uuid not null references public.student_subjects (id) on delete cascade,
  lesson_date         date not null default current_date,
  chapter             text check (chapter is null or length(chapter) <= 200),
  topic               text not null check (length(trim(topic)) between 1 and 300),
  notes               text check (notes is null or length(notes) <= 2000),
  homework            text check (homework is null or length(homework) <= 1000),
  next_topic          text check (next_topic is null or length(next_topic) <= 300),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index students_owner_idx          on public.students (owner_id, created_at desc);
create index student_subjects_student_idx on public.student_subjects (student_id);
create index student_subjects_subject_idx on public.student_subjects (subject_id);
create index lessons_ss_idx              on public.lessons (student_subject_id, lesson_date desc, created_at desc);
create index lessons_student_idx         on public.lessons (student_id, lesson_date desc);
create index lessons_owner_date_idx      on public.lessons (owner_id, lesson_date desc, created_at desc);

create trigger subjects_updated_at         before update on public.subjects         for each row execute function public.set_updated_at();
create trigger students_updated_at         before update on public.students         for each row execute function public.set_updated_at();
create trigger student_subjects_updated_at before update on public.student_subjects for each row execute function public.set_updated_at();
create trigger lessons_updated_at          before update on public.lessons          for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Renaming a grade renames it on every student in that grade
-- ---------------------------------------------------------------------------

create or replace function public.grades_rename_students()
returns trigger language plpgsql as $$
begin
  if new.name is distinct from old.name then
    update public.students set grade = new.name where owner_id = new.owner_id and grade = old.name;
  end if;
  return null;
end $$;

create trigger grades_rename_students
  after update of name on public.grades
  for each row execute function public.grades_rename_students();

-- ---------------------------------------------------------------------------
-- Consistency: a lesson's student always matches its student_subject's student
-- ---------------------------------------------------------------------------

create or replace function public.lessons_sync_student()
returns trigger language plpgsql as $$
declare
  ss_student uuid;
begin
  select student_id into ss_student from public.student_subjects where id = new.student_subject_id;
  if ss_student is null then
    raise exception 'student_subject % not found', new.student_subject_id;
  end if;
  new.student_id := ss_student;
  return new;
end $$;

create trigger lessons_sync_student
  before insert or update of student_subject_id, student_id on public.lessons
  for each row execute function public.lessons_sync_student();

-- ---------------------------------------------------------------------------
-- Progress tracking: recompute ONE student_subject from its most recent lesson.
-- Only the affected student_subject row is touched, so other subjects of the
-- same student never change. Lesson history itself is never modified.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_student_subject_progress(p_ss_id uuid)
returns void language plpgsql as $$
declare
  latest public.lessons%rowtype;
begin
  select * into latest
  from public.lessons
  where student_subject_id = p_ss_id
  order by lesson_date desc, created_at desc
  limit 1;

  if found then
    update public.student_subjects
       set last_completed_topic = latest.topic,
           next_topic           = latest.next_topic,
           current_chapter      = coalesce(nullif(trim(latest.chapter), ''), current_chapter),
           last_lesson_date     = latest.lesson_date
     where id = p_ss_id;
  else
    -- No lessons left: keep the manually entered progress, clear the date only.
    update public.student_subjects set last_lesson_date = null where id = p_ss_id;
  end if;
end $$;

create or replace function public.lessons_after_change()
returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_student_subject_progress(new.student_subject_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.student_subject_id <> new.student_subject_id) then
    perform public.refresh_student_subject_progress(old.student_subject_id);
  end if;
  return null;
end $$;

create trigger lessons_after_change
  after insert or update or delete on public.lessons
  for each row execute function public.lessons_after_change();

-- ---------------------------------------------------------------------------
-- Row Level Security: the signed-in teacher only sees and edits their own rows.
-- ---------------------------------------------------------------------------

alter table public.grades           enable row level security;
alter table public.subjects         enable row level security;
alter table public.students         enable row level security;
alter table public.student_subjects enable row level security;
alter table public.lessons          enable row level security;

create policy grades_owner on public.grades
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy subjects_owner on public.subjects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy students_owner on public.students
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy student_subjects_owner on public.student_subjects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid())
    and exists (select 1 from public.subjects j where j.id = subject_id and j.owner_id = auth.uid())
  );

create policy lessons_owner on public.lessons
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.student_subjects ss where ss.id = student_subject_id and ss.owner_id = auth.uid())
  );

-- Anonymous visitors get nothing.
revoke all on public.grades, public.subjects, public.students, public.student_subjects, public.lessons from anon;

-- Signed-in users reach the tables through the API; RLS above still limits them to their own rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.grades, public.subjects, public.students, public.student_subjects, public.lessons
  to authenticated;

-- ---------------------------------------------------------------------------
-- Default grades and subjects for each teacher account
-- ---------------------------------------------------------------------------

create or replace function public.seed_defaults(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.grades (owner_id, name, sort_order)
  select p_owner, g.name, g.ord
  from unnest(array[
    'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع',
    'الصف الخامس', 'الصف السادس', 'الصف السابع', 'الصف الثامن',
    'الصف التاسع', 'الصف العاشر', 'الصف الحادي عشر', 'الصف الثاني عشر'
  ]) with ordinality as g(name, ord)
  on conflict (owner_id, name) do nothing;

  insert into public.subjects (owner_id, name)
  select p_owner, s
  from unnest(array[
    'الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء', 'اللغة العربية',
    'اللغة الإنجليزية', 'العلوم', 'التاريخ', 'الجغرافيا'
  ]) as s
  on conflict (owner_id, name) do nothing;
end $$;

revoke all on function public.seed_defaults(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_defaults(new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed for any teacher account that already exists.
select public.seed_defaults(id) from auth.users;
