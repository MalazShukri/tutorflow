import { useEffect, useState, type FormEvent } from "react";
import { BookPlus, PencilLine } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  useAddStudentSubject,
  useSaveSubject,
  useStudentSubjects,
  useSubjects,
  useUpdateProgress,
} from "@/lib/api";
import type { StudentSubjectWithRefs } from "@/lib/types";
import { clean } from "@/lib/utils";

const NEW_SUBJECT = "__new__";

/** Assigns a subject (existing or a new custom one) to a student, with optional starting point. */
export function AddStudentSubjectDialog({
  open,
  onOpenChange,
  studentId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onAdded?: (studentSubjectId: string) => void;
}) {
  const { data: subjects = [] } = useSubjects();
  const { data: assigned = [] } = useStudentSubjects(studentId);
  const createSubject = useSaveSubject();
  const add = useAddStudentSubject();
  const [subjectId, setSubjectId] = useState("");
  const [customName, setCustomName] = useState("");
  const [chapter, setChapter] = useState("");
  const [nextTopic, setNextTopic] = useState("");
  const [error, setError] = useState("");

  const assignedIds = new Set(assigned.map((a) => a.subject_id));
  const available = subjects.filter((s) => !assignedIds.has(s.id));
  const defaultId = available.find((s) => s.is_default)?.id ?? "";

  useEffect(() => {
    if (!open) return;
    setSubjectId(defaultId);
    setCustomName("");
    setChapter("");
    setNextTopic("");
    setError("");
  }, [open, defaultId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    let id = subjectId;
    if (!id) return setError("يرجى اختيار المادة");
    if (id === NEW_SUBJECT) {
      const name = customName.trim();
      if (!name) return setError("يرجى كتابة اسم المادة الجديدة");
      const existing = subjects.find((s) => s.name === name);
      if (existing && assignedIds.has(existing.id)) return setError("هذه المادة مضافة للطالب مسبقاً");
      if (existing) id = existing.id;
      else {
        const created = await createSubject.mutateAsync({ name }).catch(() => null);
        if (!created) return;
        id = created.id;
      }
    }
    const ss = await add
      .mutateAsync({ student_id: studentId, subject_id: id, current_chapter: clean(chapter), next_topic: clean(nextTopic) })
      .catch(() => null);
    if (!ss) return;
    onOpenChange(false);
    onAdded?.(ss.id);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="إضافة مادة للطالب"
      description="لكل مادة تقدّم مستقل خاص بها."
      icon={<BookPlus />}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" form="ss-form" loading={add.isPending || createSubject.isPending}>
            إضافة المادة
          </Button>
        </>
      }
    >
      <form id="ss-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="المادة" htmlFor="ss-subject" required error={error}>
          <Select
            id="ss-subject"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
          >
            <option value="">اختر المادة</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={NEW_SUBJECT}>+ مادة جديدة غير موجودة في القائمة</option>
          </Select>
        </Field>
        {subjectId === NEW_SUBJECT && (
          <Field label="اسم المادة الجديدة" htmlFor="ss-custom" required>
            <Input
              id="ss-custom"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="مثال: الفلسفة"
              autoFocus
            />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الوحدة / الفصل الحالي" htmlFor="ss-chapter" hint="اختياري">
            <Input id="ss-chapter" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="مثال: الوحدة الأولى" />
          </Field>
          <Field label="أول موضوع سيُدرَّس" htmlFor="ss-next" hint="اختياري">
            <Input id="ss-next" value={nextTopic} onChange={(e) => setNextTopic(e.target.value)} placeholder="مثال: المعادلات" />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}

/** Manually edits the progress of one student-subject. */
export function ProgressDialog({
  open,
  onOpenChange,
  studentSubject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentSubject: StudentSubjectWithRefs;
}) {
  const update = useUpdateProgress();
  const [form, setForm] = useState({ current_chapter: "", last_completed_topic: "", next_topic: "", progress_notes: "" });

  useEffect(() => {
    if (!open) return;
    setForm({
      current_chapter: studentSubject.current_chapter ?? "",
      last_completed_topic: studentSubject.last_completed_topic ?? "",
      next_topic: studentSubject.next_topic ?? "",
      progress_notes: studentSubject.progress_notes ?? "",
    });
  }, [open, studentSubject]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await update
      .mutateAsync({
        id: studentSubject.id,
        values: {
          current_chapter: clean(form.current_chapter),
          last_completed_topic: clean(form.last_completed_topic),
          next_topic: clean(form.next_topic),
          progress_notes: clean(form.progress_notes),
        },
      })
      .then(() => true)
      .catch(() => false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`تعديل التقدّم — ${studentSubject.subject.name}`}
      description="يُحدَّث التقدّم تلقائياً عند تسجيل درس، ويمكنك تعديله يدوياً هنا."
      icon={<PencilLine />}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" form="progress-form" loading={update.isPending}>
            حفظ التقدّم
          </Button>
        </>
      }
    >
      <form id="progress-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="الوحدة / الفصل الحالي" htmlFor="p-chapter">
          <Input id="p-chapter" value={form.current_chapter} onChange={set("current_chapter")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="آخر موضوع مكتمل" htmlFor="p-last">
            <Input id="p-last" value={form.last_completed_topic} onChange={set("last_completed_topic")} />
          </Field>
          <Field label="الموضوع التالي" htmlFor="p-next">
            <Input id="p-next" value={form.next_topic} onChange={set("next_topic")} />
          </Field>
        </div>
        <Field label="ملاحظات التقدّم" htmlFor="p-notes">
          <Textarea id="p-notes" value={form.progress_notes} onChange={set("progress_notes")} placeholder="نقاط القوة والضعف، ما يحتاج إلى مراجعة..." />
        </Field>
      </form>
    </Dialog>
  );
}
