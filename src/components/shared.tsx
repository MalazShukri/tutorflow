import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookMarked, CalendarDays, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { useQuickActions } from "./QuickActions";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/dialog";
import { SubjectBadge } from "./ui/misc";
import { useDeleteLesson } from "@/lib/api";
import type { LessonWithRefs, StudentSubjectWithRefs } from "@/lib/types";
import { cn, formatDate, relativeDay } from "@/lib/utils";

/** Card showing where a student is in one subject; the next topic is the hero. */
export function SubjectProgressCard({ ss }: { ss: StudentSubjectWithRefs }) {
  return (
    <Link
      to={`/progress/${ss.id}`}
      className="group flex flex-col rounded-2xl bg-card p-5 shadow-card ring-1 ring-edge transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <BookMarked className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-ink">{ss.subject.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{ss.current_chapter ?? "لم تُحدَّد الوحدة"}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-muted transition-colors group-hover:bg-primary group-hover:text-white">
          <ArrowLeft className="size-4" />
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-accent-soft/60 px-4 py-3 ring-1 ring-accent-soft">
        <div className="text-xs font-semibold text-accent-deep">الموضوع التالي</div>
        <div className={cn("mt-0.5 font-bold", ss.next_topic ? "text-ink" : "text-muted")}>
          {ss.next_topic ?? "لم يُحدَّد بعد"}
        </div>
      </div>

      <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-muted">آخر موضوع مكتمل</dt>
          <dd className="truncate text-end font-medium text-ink">{ss.last_completed_topic ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-muted">آخر درس</dt>
          <dd className="text-end font-medium text-ink">{relativeDay(ss.last_lesson_date)}</dd>
        </div>
      </dl>
    </Link>
  );
}

/** A lesson row with view/edit/delete. `compact` hides the actions (dashboard). */
export function LessonItem({
  lesson,
  hideStudent,
  hideSubject,
  compact,
}: {
  lesson: LessonWithRefs;
  hideStudent?: boolean;
  hideSubject?: boolean;
  compact?: boolean;
}) {
  const { openLesson } = useQuickActions();
  const del = useDeleteLesson();
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(lesson.notes || lesson.homework || lesson.next_topic || lesson.chapter);

  return (
    <li className="group rounded-2xl bg-card p-4 shadow-card ring-1 ring-edge transition-all hover:shadow-lift hover:ring-primary/40 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-mist py-2 text-mist-deep">
          <CalendarDays className="size-4" />
          <span className="mt-0.5 text-xs font-semibold">{formatDate(lesson.lesson_date, true)}</span>
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 text-start"
          onClick={() => hasDetails && setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex flex-wrap items-center gap-2">
            {!hideStudent && <span className="font-semibold text-ink">{lesson.student.name}</span>}
            {!hideSubject && <SubjectBadge name={lesson.student_subject.subject.name} />}
          </div>
          <p className={cn("text-[15px] text-ink", !hideStudent || !hideSubject ? "mt-1" : "font-medium")}>
            {lesson.topic}
          </p>
          {lesson.homework && !expanded && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              <ClipboardList className="size-3.5" /> يوجد واجب منزلي
            </p>
          )}
        </button>
        {!compact && (
          <div className="flex shrink-0 gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            <Button variant="ghost" size="icon-sm" aria-label="تعديل الدرس" onClick={() => openLesson({ lesson })}>
              <Pencil />
            </Button>
            <Button variant="danger-ghost" size="icon-sm" aria-label="حذف الدرس" onClick={() => setConfirm(true)}>
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {expanded && (
        <dl className="mt-3 grid gap-3 rounded-xl bg-mist-light p-3 text-sm ring-1 ring-mist-ring/60 sm:ms-[4.75rem] sm:grid-cols-2">
          {lesson.chapter && <Detail label="الوحدة / الفصل" value={lesson.chapter} />}
          {lesson.next_topic && <Detail label="موضوع الدرس القادم" value={lesson.next_topic} />}
          {lesson.notes && <Detail label="ملاحظات" value={lesson.notes} wide />}
          {lesson.homework && <Detail label="الواجب المنزلي" value={lesson.homework} wide />}
        </dl>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="حذف الدرس"
        description={`سيتم حذف درس "${lesson.topic}" نهائياً، وسيُعاد حساب تقدّم المادة من الدروس المتبقية.`}
        loading={del.isPending}
        onConfirm={() => del.mutate(lesson.id, { onSuccess: () => setConfirm(false) })}
      />
    </li>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-ink">{value}</dd>
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary">
      <ArrowRight className="size-4" />
      {label}
    </Link>
  );
}
