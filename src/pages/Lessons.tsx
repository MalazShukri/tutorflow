import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, FilterX, History, NotebookPen, SearchX } from "lucide-react";
import { PageHeader, Section, SectionTitle } from "@/components/layout/AppLayout";
import { useQuickActions } from "@/components/QuickActions";
import { LessonItem } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/misc";
import { useLessons, useStudents, useSubjects } from "@/lib/api";
import type { LessonWithRefs } from "@/lib/types";

const monthFormatter = new Intl.DateTimeFormat("ar-EG-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });

export default function LessonsPage() {
  const { openLesson } = useQuickActions();
  const [params, setParams] = useSearchParams();
  const studentId = params.get("student") ?? "";
  const subjectId = params.get("subject") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const hasFilters = Boolean(studentId || subjectId || from || to);

  const { data: students = [] } = useStudents();
  const { data: subjects = [] } = useSubjects();
  const lessons = useLessons({
    studentId: studentId || undefined,
    subjectId: subjectId || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const groups = useMemo(() => {
    const out: { label: string; items: LessonWithRefs[] }[] = [];
    for (const l of lessons.data ?? []) {
      const [y, m] = l.lesson_date.split("-").map(Number);
      const label = monthFormatter.format(new Date(y, m - 1, 1));
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(l);
      else out.push({ label, items: [l] });
    }
    return out;
  }, [lessons.data]);

  const sortedStudents = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name, "ar")), [students]);

  return (
    <>
      <PageHeader
        title="سجل الدروس"
        icon={<History />}
        subtitle={lessons.data ? `عدد الدروس: ${lessons.data.length}` : undefined}
        actions={
          <Button size="lg" onClick={() => openLesson({ studentId: studentId || undefined })}>
            <NotebookPen />
            تسجيل درس جديد
          </Button>
        }
      />

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto_auto] xl:items-end">
        <Field label="الطالب" htmlFor="f-student">
          <Select id="f-student" value={studentId} onChange={(e) => setFilter("student", e.target.value)}>
            <option value="">كل الطلاب</option>
            {sortedStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="المادة" htmlFor="f-subject">
          <Select id="f-subject" value={subjectId} onChange={(e) => setFilter("subject", e.target.value)}>
            <option value="">كل المواد</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="من تاريخ" htmlFor="f-from">
          <Input
            id="f-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFilter("from", e.target.value)}
          />
        </Field>
        <Field label="إلى تاريخ" htmlFor="f-to">
          <Input
            id="f-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setFilter("to", e.target.value)}
          />
        </Field>
        <Button
          variant="ghost"
          className="sm:col-span-2 xl:col-span-1"
          disabled={!hasFilters}
          onClick={() => setParams({}, { replace: true })}
        >
          <FilterX />
          مسح التصفية
        </Button>
      </Card>

      {lessons.isError ? (
        <ErrorState onRetry={() => lessons.refetch()} />
      ) : lessons.isLoading ? (
        <Card className="pt-5">
          <ListSkeleton rows={5} />
        </Card>
      ) : !lessons.data?.length ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={<SearchX />} title="لا توجد دروس مطابقة" description="جرّب تغيير عوامل التصفية." />
          ) : (
            <EmptyState
              icon={<History />}
              title="سجل الدروس فارغ"
              description="كل درس تسجّله سيظهر هنا مرتّباً حسب التاريخ."
              action={
                <Button onClick={() => openLesson()}>
                  <NotebookPen />
                  تسجيل درس جديد
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <Section key={g.label}>
              <SectionTitle title={g.label} icon={<CalendarDays />} count={g.items.length} />
              <ul className="space-y-3">
                {g.items.map((l) => (
                  <LessonItem key={l.id} lesson={l} hideStudent={Boolean(studentId)} />
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </>
  );
}
