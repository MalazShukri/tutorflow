import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, BookPlus, NotebookPen } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { AddStudentSubjectDialog } from "./SubjectForms";
import { useSaveLesson, useStudentSubjects, useStudents, useSubjects } from "@/lib/api";
import type { Lesson } from "@/lib/types";
import { clean, todayISO } from "@/lib/utils";

export interface LessonPreset {
  studentId?: string;
  studentSubjectId?: string;
  lesson?: Lesson;
}

const emptyForm = {
  studentId: "",
  studentSubjectId: "",
  lesson_date: "",
  chapter: "",
  topic: "",
  next_topic: "",
  notes: "",
  homework: "",
};

export function LessonFormDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: LessonPreset;
}) {
  const editing = preset.lesson;
  const { data: students = [], isLoading: loadingStudents } = useStudents();
  const { data: subjects = [] } = useSubjects();
  const defaultSubjectId = subjects.find((s) => s.is_default)?.id;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({});
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const { data: studentSubjects = [], isFetching: loadingSubjects } = useStudentSubjects(form.studentId || undefined);
  const save = useSaveLesson();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setForm({
        studentId: editing.student_id,
        studentSubjectId: editing.student_subject_id,
        lesson_date: editing.lesson_date,
        chapter: editing.chapter ?? "",
        topic: editing.topic,
        next_topic: editing.next_topic ?? "",
        notes: editing.notes ?? "",
        homework: editing.homework ?? "",
      });
    } else {
      setForm({ ...emptyForm, lesson_date: todayISO(), studentId: preset.studentId ?? "", studentSubjectId: "" });
    }
  }, [open, editing, preset.studentId]);

  // Preselect: requested subject, else the default subject, else the only one.
  useEffect(() => {
    if (!open || editing || !form.studentId || form.studentSubjectId || loadingSubjects) return;
    const wanted =
      studentSubjects.find((s) => s.id === preset.studentSubjectId) ??
      studentSubjects.find((s) => s.subject_id === defaultSubjectId) ??
      (studentSubjects.length === 1 ? studentSubjects[0] : undefined);
    if (wanted) pickSubject(wanted.id);
  }, [open, studentSubjects, form.studentId, loadingSubjects, defaultSubjectId]);

  const sortedStudents = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name, "ar")), [students]);
  const selectedSS = studentSubjects.find((s) => s.id === form.studentSubjectId);

  function pickSubject(id: string) {
    const ss = studentSubjects.find((s) => s.id === id);
    setErrors((e) => ({ ...e, studentSubjectId: undefined }));
    setForm((f) => ({
      ...f,
      studentSubjectId: id,
      // Today's lesson usually continues where the last one planned to go.
      chapter: editing ? f.chapter : ss?.current_chapter ?? "",
      topic: editing ? f.topic : ss?.next_topic ?? "",
    }));
  }

  const set = (key: keyof typeof emptyForm) => (e: { target: { value: string } }) => {
    setErrors((er) => ({ ...er, [key]: undefined }));
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.studentId) next.studentId = "يرجى اختيار الطالب";
    if (!form.studentSubjectId) next.studentSubjectId = "يرجى اختيار المادة";
    if (!form.lesson_date) next.lesson_date = "يرجى تحديد تاريخ الدرس";
    if (!form.topic.trim()) next.topic = "يرجى كتابة الموضوع الذي تم شرحه";
    setErrors(next);
    if (Object.keys(next).length) return;

    const ok = await save
      .mutateAsync({
        id: editing?.id,
        values: {
          student_id: form.studentId,
          student_subject_id: form.studentSubjectId,
          lesson_date: form.lesson_date,
          chapter: clean(form.chapter),
          topic: form.topic.trim(),
          next_topic: clean(form.next_topic),
          notes: clean(form.notes),
          homework: clean(form.homework),
        },
      })
      .then(() => true)
      .catch(() => false);
    if (ok) onOpenChange(false);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={editing ? "تعديل الدرس" : "تسجيل درس جديد"}
        description={editing ? undefined : "سيتم تحديث تقدّم الطالب في هذه المادة تلقائياً بعد الحفظ."}
        icon={<NotebookPen />}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" form="lesson-form" loading={save.isPending}>
              {editing ? "حفظ التعديلات" : "حفظ الدرس"}
            </Button>
          </>
        }
      >
        <form id="lesson-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الطالب" htmlFor="l-student" required error={errors.studentId}>
              <Select
                id="l-student"
                value={form.studentId}
                disabled={loadingStudents}
                aria-invalid={Boolean(errors.studentId)}
                onChange={(e) => {
                  setErrors((er) => ({ ...er, studentId: undefined }));
                  setForm((f) => ({ ...f, studentId: e.target.value, studentSubjectId: "", chapter: "", topic: "" }));
                }}
              >
                <option value="">{loadingStudents ? "جارٍ التحميل..." : "اختر الطالب"}</option>
                {sortedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.grade ? ` — ${s.grade}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="المادة" htmlFor="l-subject" required error={errors.studentSubjectId}>
              <Select
                id="l-subject"
                value={form.studentSubjectId}
                disabled={!form.studentId || loadingSubjects || studentSubjects.length === 0}
                aria-invalid={Boolean(errors.studentSubjectId)}
                onChange={(e) => pickSubject(e.target.value)}
              >
                <option value="">
                  {!form.studentId ? "اختر الطالب أولاً" : loadingSubjects ? "جارٍ التحميل..." : "اختر المادة"}
                </option>
                {studentSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {form.studentId && !loadingSubjects && studentSubjects.length === 0 && (
            <div className="flex flex-col gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
              <span>لا توجد مواد مسجّلة لهذا الطالب بعد. أضف مادة أولاً لتسجيل الدرس.</span>
              <Button size="sm" variant="accent" onClick={() => setAddSubjectOpen(true)}>
                <BookPlus />
                إضافة مادة
              </Button>
            </div>
          )}

          {selectedSS && !editing && (selectedSS.last_completed_topic || selectedSS.next_topic) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-sage-light px-4 py-3 text-sm">
              <span className="text-muted">آخر ما تم:</span>
              <span className="font-medium text-ink">{selectedSS.last_completed_topic ?? "—"}</span>
              <ArrowLeft className="size-4 text-primary" />
              <span className="text-muted">المخطط له:</span>
              <span className="font-semibold text-primary">{selectedSS.next_topic ?? "—"}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="تاريخ الدرس" htmlFor="l-date" required error={errors.lesson_date}>
              <Input id="l-date" type="date" value={form.lesson_date} onChange={set("lesson_date")} max="2100-12-31" />
            </Field>
            <Field label="الوحدة / الفصل" htmlFor="l-chapter">
              <Input id="l-chapter" value={form.chapter} onChange={set("chapter")} placeholder="مثال: الوحدة الثانية" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الموضوع الذي تم شرحه" htmlFor="l-topic" required error={errors.topic}>
              <Input
                id="l-topic"
                value={form.topic}
                onChange={set("topic")}
                placeholder="مثال: حل المعادلات من الدرجة الأولى"
                aria-invalid={Boolean(errors.topic)}
              />
            </Field>
            <Field label="موضوع الدرس القادم" htmlFor="l-next">
              <Input id="l-next" value={form.next_topic} onChange={set("next_topic")} placeholder="مثال: المعادلات من الدرجة الثانية" />
            </Field>
          </div>

          <Field label="ملاحظات الدرس" htmlFor="l-notes">
            <Textarea id="l-notes" rows={2} value={form.notes} onChange={set("notes")} placeholder="كيف كان مستوى الطالب في هذا الدرس؟" />
          </Field>
          <Field label="الواجب المنزلي" htmlFor="l-hw" hint="اختياري">
            <Textarea id="l-hw" rows={2} value={form.homework} onChange={set("homework")} placeholder="مثال: حل تمارين الصفحة 42" />
          </Field>
        </form>
      </Dialog>

      {form.studentId && (
        <AddStudentSubjectDialog
          open={addSubjectOpen}
          onOpenChange={setAddSubjectOpen}
          studentId={form.studentId}
          onAdded={(id) => setForm((f) => ({ ...f, studentSubjectId: id }))}
        />
      )}
    </>
  );
}
