import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  BookPlus,
  CalendarDays,
  GraduationCap,
  History,
  MapPin,
  NotebookPen,
  Pencil,
  Phone,
  StickyNote,
  Trash2,
  UserRound,
  UserX,
} from "lucide-react";
import { PageHeader, Section, SectionTitle } from "@/components/layout/AppLayout";
import { useQuickActions } from "@/components/QuickActions";
import { AddStudentSubjectDialog } from "@/components/forms/SubjectForms";
import { BackLink, LessonItem, SubjectProgressCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Avatar, EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { cn, formatDays } from "@/lib/utils";
import { useDeleteStudent, useLessons, useStudent, useStudentSubjects } from "@/lib/api";

export default function StudentProfilePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { openLesson, openStudent } = useQuickActions();
  const student = useStudent(id);
  const subjects = useStudentSubjects(id);
  const lessons = useLessons({ studentId: id, limit: 8 });
  const del = useDeleteStudent();
  const [confirm, setConfirm] = useState(false);
  const [addSubject, setAddSubject] = useState(false);

  if (student.isError) return <ErrorState onRetry={() => student.refetch()} />;
  if (student.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-72" />
        <Skeleton className="h-28" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      </div>
    );
  }
  if (!student.data) {
    return (
      <Card>
        <EmptyState
          icon={<UserX />}
          title="الطالب غير موجود"
          description="ربما تم حذف هذا الطالب."
          action={
            <Button variant="secondary" onClick={() => navigate("/students")}>
              العودة إلى الطلاب
            </Button>
          }
        />
      </Card>
    );
  }

  const s = student.data;

  return (
    <>
      <PageHeader
        back={<BackLink to="/students" label="الطلاب" />}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={s.name} className="size-12 text-base" />
            <span className="min-w-0 truncate">{s.name}</span>
          </span>
        }
        actions={
          <>
            <Button onClick={() => openLesson({ studentId: s.id })}>
              <NotebookPen />
              تسجيل درس
            </Button>
            <Button variant="outline" onClick={() => openStudent(s)}>
              <Pencil />
              تعديل
            </Button>
            <Button variant="danger-ghost" size="icon" aria-label="حذف الطالب" onClick={() => setConfirm(true)}>
              <Trash2 />
            </Button>
          </>
        }
      />

      <Section>
        <SectionTitle title="المعلومات الشخصية" icon={<UserRound />} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Info icon={<GraduationCap />} label="الصف" value={s.grade} />
          <Info icon={<Phone />} label="رقم الهاتف" value={s.guardian_phone} ltr />
          <Info icon={<MapPin />} label="العنوان" value={s.address} />
          <Info icon={<CalendarDays />} label="أيام الدروس" value={formatDays(s.lesson_days ?? []) || null} wide />
          {s.notes && <Info icon={<StickyNote />} label="ملاحظات عامة" value={s.notes} note />}
        </div>
      </Section>

      <Section className="mt-6">
        <SectionTitle
          title="المواد والتقدّم"
          icon={<BookOpen />}
          count={subjects.data?.length}
          action={
            <Button variant="secondary" size="sm" onClick={() => setAddSubject(true)}>
              <BookPlus />
              إضافة مادة
            </Button>
          }
        />
        {subjects.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            <Skeleton className="h-52" />
            <Skeleton className="h-52" />
          </div>
        ) : !subjects.data?.length ? (
          <Card>
            <EmptyState
              icon={<BookPlus />}
              title="لم تُضف أي مادة لهذا الطالب"
              description="أضف المواد التي تدرّسها له، وسيكون لكل مادة تقدّم مستقل."
              action={
                <Button onClick={() => setAddSubject(true)}>
                  <BookPlus />
                  إضافة مادة
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {subjects.data.map((ss) => (
              <SubjectProgressCard key={ss.id} ss={ss} />
            ))}
          </div>
        )}
      </Section>

      <Section className="mt-6">
        <SectionTitle
          title="آخر الدروس"
          icon={<History />}
          action={
            lessons.data?.length ? (
              <Link to={`/lessons?student=${s.id}`} className="text-sm font-semibold text-primary hover:underline">
                السجل الكامل
              </Link>
            ) : undefined
          }
        />
        {lessons.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : !lessons.data?.length ? (
          <Card>
            <EmptyState icon={<NotebookPen />} title="لا توجد دروس مسجلة لهذا الطالب" className="py-10" />
          </Card>
        ) : (
          <ul className="space-y-3">
            {lessons.data.map((l) => (
              <LessonItem key={l.id} lesson={l} hideStudent />
            ))}
          </ul>
        )}
      </Section>

      <AddStudentSubjectDialog open={addSubject} onOpenChange={setAddSubject} studentId={s.id} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="حذف الطالب"
        description={`سيتم حذف "${s.name}" نهائياً مع جميع مواده وسجل دروسه. لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف الطالب"
        loading={del.isPending}
        onConfirm={() =>
          del.mutate(s.id, {
            onSuccess: () => {
              setConfirm(false);
              navigate("/students", { replace: true });
            },
          })
        }
      />
    </>
  );
}

function Info({
  icon,
  label,
  value,
  ltr,
  wide,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  ltr?: boolean;
  /** Spans the whole row. */
  wide?: boolean;
  /** Full-width, coral-accented card for free text. */
  note?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-2xl p-4 shadow-card ring-1",
        wide && "sm:col-span-3",
        note ? "bg-accent-faint ring-accent-soft sm:col-span-3" : "bg-card ring-mist-ring/60",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
          note ? "bg-accent-soft text-accent" : "bg-sage text-primary",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className="mt-0.5 whitespace-pre-line break-words text-[15px] font-medium text-ink">
          {value ? ltr ? <span dir="ltr">{value}</span> : value : <span className="font-normal text-muted">—</span>}
        </div>
      </div>
    </div>
  );
}
