# TutorFlow — مُعلّمي

A simple, Arabic (RTL) web app for one private teacher to manage students, the subjects taught to each student, per-subject progress, and lesson history.

Stack: React 18 + TypeScript + Vite, Tailwind CSS, shadcn-style components (Radix), Lucide icons, TanStack Query, Supabase (Postgres + Auth).

Pages: الطلاب (home) → student profile → subject progress, سجل الدروس, الإعدادات (subjects with a default subject, grades, account).

## Demo mode (no backend)

```
npm install
npm run dev
```

Without Supabase settings the app runs in demo mode: sign in with any email and password, sample data is stored in the browser's localStorage, and Settings has a button to reset it. Set `VITE_DEMO_MODE=true` to force demo mode even when Supabase is configured.

## Connect Supabase

1. Create a project at https://supabase.com (free plan is enough). Pick a region close to the users.
2. Open *SQL Editor → New query*, paste all of `supabase/migrations/0001_init.sql`, and click *Run*.
3. *Authentication → Users → Add user → Create new user*: enter the teacher's email and password, tick *Auto Confirm User*.
   Default grades and subjects are created for the account automatically.
4. *Authentication → Sign In / Providers → Email*: turn off *Allow new users to sign up*.
5. *Project Settings → API*: copy the *Project URL* and the *anon public* key into a `.env` file (copy `.env.example`):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
6. Restart `npm run dev`. The demo banner disappears and the login uses the real account.

The anon key is safe to ship in the browser: every table has Row Level Security, so only the signed-in teacher can read or change their own rows.

## Deploy (Vercel)

1. Push this folder to a GitHub repository.
2. On https://vercel.com: *Add New → Project*, import the repository. Vercel detects Vite (build `npm run build`, output `dist`).
3. Under *Environment Variables* add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then *Deploy*.
4. Share the `*.vercel.app` link and the login created in step 3 above.

`vercel.json` rewrites all routes to `index.html` so page refreshes work. Without the environment variables the deployed site runs in demo mode (data saved only in each visitor's browser).

## Data model

| Table | Purpose |
| --- | --- |
| `students` | Student info (name, grade, address, guardian phone, notes) |
| `subjects` | Subject catalogue (defaults + custom); at most one `is_default` per teacher |
| `grades` | Grade options shown in the student form; renaming a grade renames it on its students |
| `student_subjects` | One row per student × subject, holding that subject's own progress |
| `lessons` | Lesson history; references the student and the `student_subjects` row |

Every table has `owner_id` (defaults to `auth.uid()`) and an RLS policy limiting access to the owner. The `anon` role has no access.

### Progress tracking

Progress is updated by a database trigger, so it stays correct whatever the client does:

- After a lesson is inserted, updated, or deleted, `refresh_student_subject_progress` recomputes **only that lesson's `student_subjects` row** from its most recent lesson (by `lesson_date`, then `created_at`).
- Other subjects of the same student are never touched.
- A back-dated lesson does not move progress backwards; deleting the latest lesson rolls progress back.
- A lesson's `student_id` is always forced to match its `student_subjects` row.

The demo backend (`src/lib/mock.ts`) applies the same rules in the browser.

## Project layout

```
src/
  lib/          backend.ts (Supabase implementation + interface), mock.ts (demo data), api.ts (React Query hooks), types, utils
  hooks/        auth (Supabase or demo)
  components/
    ui/         button, fields, card, dialogs, badges, empty states
    layout/     sidebar layout (right side, RTL) and page header
    forms/      student, lesson, subject/progress dialogs
    QuickActions.tsx   app-wide "record lesson" / "add student" dialogs
    NameListCard.tsx   editable name list used in Settings
    shared.tsx  subject progress card, lesson row
  pages/        Login, Students, StudentProfile, SubjectProgress, Lessons, Settings
supabase/migrations/0001_init.sql
vercel.json
```
