import { useState, type FormEvent } from "react";
import { BookOpen, FlaskConical, Settings as SettingsIcon, GraduationCap, KeyRound, LogOut, RotateCcw, Star, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { NameListCard } from "@/components/NameListCard";
import {
  useDeleteGrade,
  useDeleteSubject,
  useGrades,
  useSaveGrade,
  useSaveSubject,
  useSetDefaultSubject,
  useStudentSubjects,
  useSubjects,
} from "@/lib/api";
import { auth, useAuth } from "@/hooks/auth";
import { isDemoMode } from "@/lib/backend";
import { resetDemoData } from "@/lib/mock";
import { useQueryClient } from "@tanstack/react-query";
import { arabicError } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="الإعدادات" icon={<SettingsIcon />} subtitle="المواد الدراسية والصفوف وحسابك." />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <SubjectsCard />
          <GradesCard />
        </div>
        <div className="space-y-6">
          <AccountCard />
          {isDemoMode && <DemoCard />}
        </div>
      </div>
    </>
  );
}

const ok = (p: Promise<unknown>) => p.then(() => true).catch(() => false);

function SubjectsCard() {
  const subjects = useSubjects();
  const { data: links = [] } = useStudentSubjects();
  const save = useSaveSubject();
  const del = useDeleteSubject();
  const setDefault = useSetDefaultSubject();
  const usage = (id: string) => links.filter((l) => l.subject_id === id).length;

  return (
    <NameListCard
      title="المواد الدراسية"
      icon={<BookOpen />}
      description="اضغط على النجمة لجعل المادة افتراضية، فتُختار تلقائياً عند إضافة طالب أو تسجيل درس."
      addPlaceholder="اسم مادة جديدة"
      emptyText="لا توجد مواد."
      items={subjects.data}
      isLoading={subjects.isLoading}
      isError={subjects.isError}
      onRetry={() => subjects.refetch()}
      saving={save.isPending}
      deleting={del.isPending}
      onAdd={(name) => ok(save.mutateAsync({ name }))}
      onRename={(s, name) => ok(save.mutateAsync({ id: s.id, name }))}
      onDelete={async (s) => {
        if (usage(s.id)) {
          toast.error("لا يمكن حذف مادة مسندة لطلاب. أزلها من صفحات الطلاب أولاً.");
          return true;
        }
        return ok(del.mutateAsync(s.id));
      }}
      deleteDescription={(s) =>
        usage(s.id)
          ? `مادة "${s.name}" مسندة إلى ${usage(s.id)} من الطلاب، لذلك لا يمكن حذفها الآن.`
          : `سيتم حذف مادة "${s.name}" من القائمة.`
      }
      renderTag={(s) => (s.is_default ? <Badge>افتراضية</Badge> : null)}
      renderExtra={(s) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={s.is_default ? `إلغاء ${s.name} كمادة افتراضية` : `جعل ${s.name} المادة الافتراضية`}
          aria-pressed={s.is_default}
          disabled={setDefault.isPending}
          onClick={() => setDefault.mutate(s.is_default ? null : s.id)}
        >
          <Star className={s.is_default ? "fill-accent text-accent" : ""} />
        </Button>
      )}
    />
  );
}

function GradesCard() {
  const grades = useGrades();
  const save = useSaveGrade();
  const del = useDeleteGrade();

  return (
    <NameListCard
      title="الصفوف الدراسية"
      icon={<GraduationCap />}
      description="تظهر هذه الصفوف كخيارات عند إضافة طالب. تعديل اسم الصف يحدّثه لدى جميع طلابه."
      addPlaceholder="اسم صف جديد"
      emptyText="لا توجد صفوف."
      items={grades.data}
      isLoading={grades.isLoading}
      isError={grades.isError}
      onRetry={() => grades.refetch()}
      saving={save.isPending}
      deleting={del.isPending}
      onAdd={(name) => {
        const maxOrder = Math.max(0, ...(grades.data ?? []).map((g) => g.sort_order));
        return ok(save.mutateAsync({ name, sort_order: maxOrder + 1 }));
      }}
      onRename={(g, name) => ok(save.mutateAsync({ id: g.id, name }))}
      onDelete={(g) => ok(del.mutateAsync(g.id))}
      deleteDescription={(g) => `سيتم حذف "${g.name}" من قائمة الصفوف. لن يتغيّر صف الطلاب المسجّلين فيه.`}
    />
  );
}

function AccountCard() {
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("يجب أن تتكوّن كلمة المرور من 8 أحرف على الأقل");
    if (password !== confirmPw) return setError("كلمتا المرور غير متطابقتين");
    setError("");
    setLoading(true);
    const { error: err } = await auth.updatePassword(password);
    setLoading(false);
    if (err) return toast.error(arabicError(err));
    toast.success("تم تغيير كلمة المرور");
    setPassword("");
    setConfirmPw("");
  }

  return (
    <Card className="h-fit">
      <CardHeader title="الحساب" icon={<UserCircle />} />
      <div className="px-5">
        <div className="rounded-xl bg-background px-4 py-3">
          <div className="text-xs text-muted">البريد الإلكتروني</div>
          <div className="mt-0.5 font-medium text-ink" dir="ltr" style={{ textAlign: "right" }}>
            {session?.user.email}
          </div>
        </div>
      </div>

      <form onSubmit={changePassword} noValidate className="space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <KeyRound className="size-4 text-primary" />
          تغيير كلمة المرور
        </h3>
        <Field label="كلمة المرور الجديدة" htmlFor="new-pw">
          <Input id="new-pw" type="password" dir="ltr" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="تأكيد كلمة المرور" htmlFor="confirm-pw" error={error}>
          <Input
            id="confirm-pw"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </Field>
        <Button type="submit" variant="secondary" loading={loading}>
          حفظ كلمة المرور
        </Button>
      </form>

      <div className="border-t border-line p-5">
        <Button variant="danger-ghost" onClick={() => auth.signOut()}>
          <LogOut />
          تسجيل الخروج
        </Button>
      </div>
    </Card>
  );
}

function DemoCard() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  return (
    <Card className="h-fit">
      <CardHeader title="الوضع التجريبي" icon={<FlaskConical />} />
      <p className="px-5 text-sm leading-relaxed text-muted">
        التطبيق يعمل حالياً ببيانات تجريبية محفوظة في هذا المتصفح فقط. يمكنك إعادة البيانات إلى حالتها الأصلية في أي وقت.
      </p>
      <div className="p-5">
        <Button variant="outline" onClick={() => setConfirm(true)}>
          <RotateCcw />
          إعادة تعيين البيانات التجريبية
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="إعادة تعيين البيانات"
        description="سيتم حذف كل التعديلات التي أجريتها واستعادة البيانات التجريبية الأصلية."
        confirmLabel="إعادة التعيين"
        onConfirm={() => {
          resetDemoData();
          qc.invalidateQueries();
          setConfirm(false);
          toast.success("تمت استعادة البيانات التجريبية");
        }}
      />
    </Card>
  );
}
