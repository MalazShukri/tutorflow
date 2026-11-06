import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  BookX,
  CalendarDays,
  CheckCircle2,
  Flag,
  History,
  Layers,
  NotebookPen,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
import { PageHeader, Section, SectionTitle } from "@/components/layout/AppLayout";
import { useQuickActions } from "@/components/QuickActions";
import { ProgressDialog } from "@/components/forms/SubjectForms";
import { BackLink, LessonItem } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { useDeleteStudentSubject, useLessons, useStudentSubject } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SubjectProgressPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { openLesson } = useQuickActions();
  const ss = useStudentSubject(id);
  const lessons = useLessons({ studentSubjectId: id });
  const remove = useDeleteStudentSubject();
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (ss.isError) return <ErrorState onRetry={() => ss.refetch()} />;
  if (ss.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!ss.data) {
    return (
      <Card>
        <EmptyState
          icon={<BookX />}
          title="المادة غير موجودة"
          description="ربما تمت إزالة هذه المادة من الطالب."
          action={
            <Button variant="secondary" onClick={() => navigate("/")}>
              العودة إلى الطلاب
            </Button>
          }
        />
      </Card>
    );
  }

  const d = ss.data;
  const count = lessons.data?.length ?? 0;

  return (
    <>
      <PageHeader
        back={<BackLink to={`/students/${d.student_id}`} label={d.student.name} />}
        title={d.subject.name}
        icon={<BookOpen />}
        subtitle={`${d.student.name} · عدد الدروس: ${count}`}
        actions={
          <>
            <Button onClick={() => openLesson({ studentId: d.student_id, studentSubjectId: d.id })}>
              <NotebookPen />
              تسجيل درس
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              تعديل التقدّم
            </Button>
            <Button
              variant="danger-ghost"
              size="icon"
              aria-label="إزالة المادة من الطالب"
              onClick={() => setConfirm(true)}
            >
              <Trash2 />
            </Button>
          </>
        }
      />

      {/* Next topic is the hero: where to continue in the next session. */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-sidebar-from to-sidebar-to p-6 text-white shadow-lift sm:p-7">
        <div className="absolute -start-10 -top-10 size-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 end-10 size-48 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-medium text-white/75">
            <Flag className="size-4" />
            الموضوع التالي — من هنا تبدأ الحصة القادمة
          </div>
          <div className="mt-2 text-2xl font-bold sm:text-3xl">{d.next_topic ?? "لم يُحدَّد بعد"}</div>
        </div>
      </div>

      <Section className="mt-6">
        <SectionTitle title="ملخّص التقدّم" icon={<CheckCircle2 />} />
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile tone="teal" icon={<CheckCircle2 />} label="آخر موضوع مكتمل" value={d.last_completed_topic} />
          <InfoTile tone="mist" icon={<Layers />} label="الوحدة / الفصل الحالي" value={d.current_chapter} />
          <InfoTile
            tone="mist"
            icon={<CalendarDays />}
            label="تاريخ آخر درس"
            value={d.last_lesson_date ? formatDate(d.last_lesson_date) : null}
          />
          {d.progress_notes && (
            <div className="flex gap-3 rounded-2xl bg-accent-faint p-4 shadow-card ring-1 ring-accent-soft sm:col-span-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <StickyNote className="size-5" />
              </span>
              <div>
                <div className="text-sm text-muted">ملاحظات التقدّم</div>
                <p className="mt-0.5 whitespace-pre-line text-[15px] font-medium leading-relaxed text-ink">
                  {d.progress_notes}
                </p>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section className="mt-6">
        <SectionTitle title="سجل دروس المادة" icon={<History />} count={count} />
        {lessons.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : !count ? (
          <Card>
            <EmptyState
              icon={<NotebookPen />}
              title="لا توجد دروس في هذه المادة بعد"
              description="عند تسجيل درس سيتم تحديث التقدّم أعلاه تلقائياً."
              action={
                <Button onClick={() => openLesson({ studentId: d.student_id, studentSubjectId: d.id })}>
                  <NotebookPen />
                  تسجيل درس
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {lessons.data!.map((l) => (
              <LessonItem key={l.id} lesson={l} hideStudent hideSubject />
            ))}
          </ul>
        )}
      </Section>

      <ProgressDialog open={editOpen} onOpenChange={setEditOpen} studentSubject={d} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="إزالة المادة من الطالب"
        description={`سيتم إزالة مادة "${d.subject.name}" من الطالب "${d.student.name}" مع حذف سجل دروسها (${count}). لن تتأثر المواد الأخرى.`}
        confirmLabel="إزالة المادة"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(d.id, {
            onSuccess: () => {
              setConfirm(false);
              navigate(`/students/${d.student_id}`, { replace: true });
            },
          })
        }
      />
    </>
  );
}

function InfoTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  tone: "teal" | "mist";
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-edge">
      <span
        className={
          "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 " +
          (tone === "teal" ? "bg-sage text-primary" : "bg-mist text-mist-deep")
        }
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm text-muted">{label}</div>
        <div className="mt-0.5 break-words font-semibold text-ink">
          {value ?? <span className="font-normal text-muted">—</span>}
        </div>
      </div>
    </div>
  );
}
