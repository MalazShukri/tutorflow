import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Search, SearchX, UserPlus, Users } from "lucide-react";
import { PageHeader, Section, SectionTitle } from "@/components/layout/AppLayout";
import { useQuickActions } from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Avatar, EmptyState, ErrorState, Skeleton, SubjectBadge } from "@/components/ui/misc";
import { useStudentSubjects, useStudents } from "@/lib/api";
import type { StudentSubjectWithRefs } from "@/lib/types";

export default function StudentsPage() {
  const { openStudent } = useQuickActions();
  const students = useStudents();
  const { data: allSubjects = [] } = useStudentSubjects();
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");

  const subjectsByStudent = useMemo(() => {
    const map = new Map<string, StudentSubjectWithRefs[]>();
    for (const ss of allSubjects) map.set(ss.student_id, [...(map.get(ss.student_id) ?? []), ss]);
    return map;
  }, [allSubjects]);

  const grades = useMemo(
    () => [...new Set((students.data ?? []).map((s) => s.grade).filter(Boolean) as string[])],
    [students.data],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (students.data ?? [])
      .filter((s) => !grade || s.grade === grade)
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.guardian_phone?.includes(q) ||
          s.address?.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [students.data, query, grade]);

  const total = students.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title="الطلاب"
        icon={<Users />}
        subtitle={total ? `عدد الطلاب: ${total}` : "أضف طلابك وتابع تقدّمهم"}
        actions={
          <Button size="lg" onClick={() => openStudent()}>
            <UserPlus />
            إضافة طالب
          </Button>
        }
      />

      <Section>
        <SectionTitle title="قائمة الطلاب" icon={<Users />} count={total ? filtered.length : undefined} />
        {total > 0 && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف أو العنوان..."
                className="ps-10"
                aria-label="بحث عن طالب"
              />
            </div>
            {grades.length > 1 && (
              <Select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                aria-label="تصفية حسب الصف"
                className="sm:w-48"
              >
                <option value="">كل الصفوف</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {students.isError ? (
          <ErrorState onRetry={() => students.refetch()} />
        ) : students.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : total === 0 ? (
          <Card>
            <EmptyState
              icon={<Users />}
              title="لا يوجد طلاب بعد"
              description="أضف طالبك الأول لتبدأ بتسجيل دروسه ومتابعة تقدّمه في كل مادة."
              action={
                <Button onClick={() => openStudent()}>
                  <UserPlus />
                  إضافة طالب
                </Button>
              }
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState icon={<SearchX />} title="لا توجد نتائج" description="جرّب كلمة بحث أخرى أو غيّر الصف." />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {filtered.map((s) => {
              const subjects = subjectsByStudent.get(s.id) ?? [];
              return (
                <Link
                  key={s.id}
                  to={`/students/${s.id}`}
                  className="group flex flex-col rounded-2xl bg-card p-5 shadow-card ring-1 ring-edge transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} className="size-12 text-base" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold text-ink">{s.name}</div>
                      <span className="mt-1 inline-block rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-mist-deep">
                        {s.grade ?? "بدون صف"}
                      </span>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-muted transition-colors group-hover:bg-primary group-hover:text-white">
                      <ArrowLeft className="size-4" />
                    </span>
                  </div>

                  <div className="mt-4 border-t border-line pt-3">
                    <div className="mb-2 text-xs font-medium text-muted">المواد</div>
                    <div className="flex min-h-[26px] flex-wrap gap-1.5">
                      {subjects.length ? (
                        subjects.map((ss) => <SubjectBadge key={ss.id} name={ss.subject.name} />)
                      ) : (
                        <span className="text-sm text-muted">لم تُضف مواد بعد</span>
                      )}
                    </div>
                  </div>

                  {(s.guardian_phone || s.address) && (
                    <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-sm text-muted">
                      {s.guardian_phone && (
                        <span className="flex items-center gap-1.5" dir="ltr">
                          {s.guardian_phone}
                          <Phone className="size-3.5" />
                        </span>
                      )}
                      {s.address && (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{s.address}</span>
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
