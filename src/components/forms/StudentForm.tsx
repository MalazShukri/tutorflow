import { useEffect, useState, type FormEvent } from "react";
import { Clock, UserPlus, UserPen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useGrades, useSaveStudent, useSubjects, type StudentInput } from "@/lib/api";
import type { LessonTime, Student } from "@/lib/types";
import { WEEKDAYS, clean, cn } from "@/lib/utils";

const empty = { name: "", grade: "", address: "", guardian_phone: "", notes: "", subjectId: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

export function StudentFormDialog({ open, onOpenChange, student }: Props) {
  const navigate = useNavigate();
  const { data: grades = [] } = useGrades();
  const { data: subjects = [] } = useSubjects();
  const save = useSaveStudent();
  const [form, setForm] = useState<Record<keyof typeof empty, string>>(empty);
  const [days, setDays] = useState<number[]>([]);
  const [times, setTimes] = useState<Record<string, LessonTime>>({});
  const [timeError, setTimeError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof typeof empty, string>>>({});

  const defaultSubjectId = subjects.find((s) => s.is_default)?.id ?? "";

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDays(student?.lesson_days ?? []);
    setTimes(student?.lesson_times ?? {});
    setTimeError("");
    setForm(
      student
        ? {
            name: student.name,
            grade: student.grade ?? "",
            address: student.address ?? "",
            guardian_phone: student.guardian_phone ?? "",
            notes: student.notes ?? "",
            subjectId: "",
          }
        : { ...empty, subjectId: defaultSubjectId },
    );
  }, [open, student, defaultSubjectId]);

  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "اسم الطالب مطلوب";
    else if (form.name.trim().length > 120) next.name = "الاسم طويل جداً";
    const phone = form.guardian_phone.trim();
    if (phone && !/^[0-9+()\-\s]{4,25}$/.test(phone)) next.guardian_phone = "رقم الهاتف غير صالح";
    const badDay = WEEKDAYS.find(({ day }) => {
      const t = times[day];
      return days.includes(day) && t?.from && t.to && t.to <= t.from;
    });
    setTimeError(badDay ? `وقت النهاية يجب أن يكون بعد وقت البداية (${badDay.label})` : "");
    setErrors(next);
    return Object.keys(next).length === 0 && !badDay;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const values: StudentInput = {
      name: form.name.trim(),
      grade: clean(form.grade),
      address: clean(form.address),
      guardian_phone: clean(form.guardian_phone),
      notes: clean(form.notes),
      lesson_days: days,
      // Keep only times of selected days that have a value.
      lesson_times: Object.fromEntries(
        days
          .map((d) => [String(d), { from: times[d]?.from || null, to: times[d]?.to || null }] as const)
          .filter(([, t]) => t.from || t.to),
      ),
    };
    const saved = await save
      .mutateAsync({ id: student?.id, values, subjectId: student ? undefined : form.subjectId || undefined })
      .catch(() => null);
    if (!saved) return;
    onOpenChange(false);
    if (!student) navigate(`/students/${saved.id}`);
  }

  function toggleDay(day: number, on: boolean) {
    if (on) return setDays((d) => d.filter((x) => x !== day));
    setDays((d) => [...d, day]);
    // A newly picked day starts with the time of the last day that has one.
    const last = [...days].reverse().map((d) => times[d]).find((t) => t?.from || t?.to);
    if (last && !times[day]?.from && !times[day]?.to) setTimes((t) => ({ ...t, [day]: { ...last } }));
  }

  function setTime(day: number, key: keyof LessonTime, value: string) {
    setTimes((t) => ({ ...t, [day]: { from: t[day]?.from ?? null, to: t[day]?.to ?? null, [key]: value || null } }));
  }

  // Keep a grade that was removed from settings visible while editing.
  const gradeOptions = grades.map((g) => g.name);
  if (form.grade && !gradeOptions.includes(form.grade)) gradeOptions.unshift(form.grade);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={student ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
      description={student ? undefined : "أدخل بيانات الطالب الأساسية، ويمكنك تعديلها لاحقاً."}
      icon={student ? <UserPen /> : <UserPlus />}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" form="student-form" loading={save.isPending}>
            {student ? "حفظ التعديلات" : "إضافة الطالب"}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم الطالب" htmlFor="s-name" required error={errors.name} className="sm:col-span-2">
          <Input
            id="s-name"
            value={form.name}
            onChange={set("name")}
            placeholder="مثال: أحمد محمد"
            aria-invalid={Boolean(errors.name)}
            autoFocus
          />
        </Field>
        <Field label="الصف" htmlFor="s-grade">
          <Select id="s-grade" value={form.grade} onChange={set("grade")}>
            <option value="">اختر الصف</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        {!student && (
          <Field label="المادة" htmlFor="s-subject" hint="يمكنك إضافة مواد أخرى من صفحة الطالب">
            <Select id="s-subject" value={form.subjectId} onChange={set("subjectId")}>
              <option value="">بدون مادة الآن</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="رقم الهاتف" htmlFor="s-phone" error={errors.guardian_phone} hint="اختياري">
          <Input
            id="s-phone"
            type="tel"
            dir="ltr"
            className="text-right"
            value={form.guardian_phone}
            onChange={set("guardian_phone")}
            placeholder="09xxxxxxxx"
            aria-invalid={Boolean(errors.guardian_phone)}
          />
        </Field>
        <Field label="العنوان" htmlFor="s-address">
          <Input id="s-address" value={form.address} onChange={set("address")} placeholder="المدينة، الحي، الشارع" />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">أيام الدروس</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(({ day, label }) => {
              const on = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(day, on)}
                  className={cn(
                    "h-10 rounded-xl px-3.5 text-sm font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    on ? "bg-primary text-white ring-primary" : "bg-card text-ink ring-edge hover:bg-sage",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted">الأيام التي تعطيه فيها درساً خصوصياً، ليظهر في جدول ذلك اليوم.</p>

          {days.length > 0 && (
            <div className="mt-3 space-y-2 rounded-2xl bg-mist p-3 ring-1 ring-mist-ring">
              <div className="flex items-center gap-1.5 text-xs font-medium text-mist-deep">
                <Clock className="size-3.5" />
                وقت الدرس (اختياري)
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-[4.5rem_1fr_1fr]" aria-hidden>
                <span className="hidden sm:block" />
                <span className="text-center">من</span>
                <span className="text-center">إلى</span>
              </div>
              {WEEKDAYS.filter(({ day }) => days.includes(day)).map(({ day, label }) => (
                <div key={day} className="grid grid-cols-2 items-center gap-x-2 gap-y-1 sm:grid-cols-[4.5rem_1fr_1fr]">
                  <span className="col-span-2 text-sm font-semibold text-ink sm:col-span-1">{label}</span>
                  <TimeInput label={`من - ${label}`} value={times[day]?.from ?? ""} onChange={(v) => setTime(day, "from", v)} />
                  <TimeInput label={`إلى - ${label}`} value={times[day]?.to ?? ""} onChange={(v) => setTime(day, "to", v)} />
                </div>
              ))}
              {timeError && <p className="text-xs font-medium text-danger">{timeError}</p>}
            </div>
          )}
        </fieldset>
        <Field label="ملاحظات عامة" htmlFor="s-notes" className="sm:col-span-2">
          <Textarea id="s-notes" value={form.notes} onChange={set("notes")} placeholder="أي ملاحظات تخص الطالب..." />
        </Field>
      </form>
    </Dialog>
  );
}

/** Native time field: opens the phone's own hour/minute wheel or clock, minutes included. */
function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Input
      type="time"
      step={60}
      dir="ltr"
      aria-label={label}
      // Hours and minutes only: a value with seconds would make the browser show a seconds field.
      value={value.slice(0, 5)}
      onChange={(e) => onChange(e.target.value.slice(0, 5))}
      className="min-w-0 cursor-pointer px-2 text-center tabular-nums [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert"
    />
  );
}
