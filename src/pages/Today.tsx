import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookMarked, CalendarCheck, CalendarDays, CheckCircle2, MapPin, NotebookPen, Phone, Users } from "lucide-react";
import { PageHeader, Section, SectionTitle } from "@/components/layout/AppLayout";
import { useQuickActions } from "@/components/QuickActions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { useLessons, useStudentSubjects, useStudents } from "@/lib/api";
import type { Student, StudentSubjectWithRefs } from "@/lib/types";
import { WEEKDAYS, cn, dayLabel, formatDate, todayISO } from "@/lib/utils";

export default function TodayPage() {
  const { openLesson } = useQuickActions();
  const students = useStudents();
  const { data: allSubjects = [] } = useStudentSubjects();
  const today = new Date().getDay();
  const [day, setDay] = useState(today);
  const todayLessons = useLessons({ from: todayISO(), to: todayISO() });

  const subjectsByStudent = useMemo(() => {
    const map = new Map<string, StudentSubjectWithRefs[]>();
    for (const ss of allSubjects) map.set(ss.student_id, [...(map.get(ss.student_id) ?? []), ss]);
    return map;
  }, [allSubjects]);

  const countByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of students.data ?? []) for (const d of s.lesson_days ?? []) map.set(d, (map.get(d) ?? 0) + 1);
    return map;
  }, [students.data]);

  const scheduled = useMemo(
    () =>
      (students.data ?? [])
        .filter((s) => s.lesson_days?.includes(day))
        .sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [students.data, day],
  );

  const doneToday = useMemo(() => new Set((todayLessons.data ?? []).map((l) => l.student_id)), [todayLessons.data]);
  const isToday = day === today;
  const anyScheduled = countByDay.size > 0;

  return (
    <>
      <PageHeader
        title="جدول اليوم"
        icon={<CalendarDays />}
        subtitle={`${dayLabel(today)}، ${formatDate(todayISO())}`}
        actions={
          <Button size="lg" onClick={() => openLesson()}>
            <NotebookPen />
            تسجيل درس
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-7" role="tablist" aria-label="أيام الأسبوع">
        {WEEKDAYS.map(({ day: d, label }) => {
          const active = d === day;
          const count = countByDay.get(d) ?? 0;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              onClick={() => setDay(d)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-sm font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "bg-primary text-white shadow-md ring-primary"
                  : "bg-card text-ink shadow-card ring-edge hover:bg-sage",
              )}
            >
              <span>{d === today ? `${label} (اليوم)` : label}</span>
              <span
                className={cn(
                  "rounded-full px-2 text-xs font-medium",
                  active ? "bg-white/20 text-white" : count ? "bg-sage text-primary" : "text-muted",
                )}
              >
                {count ? studentsCount(count) : "—"}
              </span>
            </button>
          );
        })}
      </div>

      <Section>
        <SectionTitle
          title={isToday ? "طلاب اليوم" : `طلاب يوم ${dayLabel(day)}`}
          icon={<Users />}
          count={students.data ? scheduled.length : undefined}
        />
        {students.isError ? (
          <ErrorState onRetry={() => students.refetch()} />
        ) : students.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : scheduled.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CalendarCheck />}
              title={isToday ? "لا توجد دروس اليوم" : `لا توجد دروس يوم ${dayLabel(day)}`}
              description={
                anyScheduled
                  ? "لا يوجد طالب مسجّل في هذا اليوم."
                  : "حدّد أيام الدروس لكل طالب من زر «تعديل» في صفحته، ليظهر هنا في يومه."
              }
              action={
                <Link to="/students" className={buttonVariants({ variant: "secondary" })}>
                  <Users />
                  الطلاب
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {scheduled.map((s) => (
              <ScheduleCard
                key={s.id}
                student={s}
                subjects={subjectsByStudent.get(s.id) ?? []}
                done={isToday && doneToday.has(s.id)}
                onRecord={() => openLesson({ studentId: s.id })}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function ScheduleCard({
  student: s,
  subjects,
  done,
  onRecord,
}: {
  student: Student;
  subjects: StudentSubjectWithRefs[];
  done: boolean;
  onRecord: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-card p-5 shadow-card ring-1 ring-edge">
      <Link to={`/students/${s.id}`} className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <Avatar name={s.name} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold text-ink group-hover:text-primary">{s.name}</div>
          <span className="mt-1 inline-block rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-mist-deep">
            {s.grade ?? "بدون صف"}
          </span>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-muted transition-colors group-hover:bg-primary group-hover:text-white">
          <ArrowLeft className="size-4" />
        </span>
      </Link>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-mist-light px-3.5 py-3 ring-1 ring-mist-ring/60">
        <MapPin className="mt-0.5 size-4 shrink-0 text-mist-deep" />
        <div className="min-w-0">
          <div className="text-xs text-muted">المكان</div>
          <div className={cn("break-words text-sm font-medium", s.address ? "text-ink" : "text-muted")}>
            {s.address ?? "لم يُحدَّد العنوان"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <div className="mb-2 text-xs font-medium text-muted">المواد وما سيُدرَّس</div>
        {subjects.length ? (
          <ul className="space-y-2">
            {subjects.map((ss) => (
              <li key={ss.id}>
                <Link
                  to={`/progress/${ss.id}`}
                  className="block rounded-xl bg-accent-soft/50 px-3.5 py-2.5 ring-1 ring-accent-soft transition-colors hover:bg-accent-soft"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    <BookMarked className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{ss.subject.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {ss.current_chapter && <span className="block truncate">الوحدة: {ss.current_chapter}</span>}
                    <span className="block">
                      الموضوع التالي:{" "}
                      <span className={cn("font-semibold", ss.next_topic ? "text-accent-deep" : "text-muted")}>
                        {ss.next_topic ?? "لم يُحدَّد بعد"}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-muted">لم تُضف مواد بعد</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 border-t border-line pt-4">
        {s.guardian_phone ? (
          <a href={`tel:${s.guardian_phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-primary" dir="ltr">
            {s.guardian_phone}
            <Phone className="size-3.5" />
          </a>
        ) : (
          <span />
        )}
        {done ? (
          <span className="flex items-center gap-1.5 rounded-full bg-sage px-3 py-1.5 text-sm font-semibold text-primary">
            <CheckCircle2 className="size-4" />
            تم تسجيل الدرس
          </span>
        ) : (
          <Button size="sm" onClick={onRecord}>
            <NotebookPen />
            تسجيل درس
          </Button>
        )}
      </div>
    </div>
  );
}

function studentsCount(n: number) {
  if (n === 1) return "طالب واحد";
  if (n === 2) return "طالبان";
  return `${n} ${n <= 10 ? "طلاب" : "طالباً"}`;
}
