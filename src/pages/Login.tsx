import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { GraduationCap, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { auth, useAuth } from "@/hooks/auth";
import { isDemoMode } from "@/lib/backend";
import { ThemeToggle } from "@/hooks/theme";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { arabicError } from "@/lib/utils";

export default function LoginPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
    setError("");
    setLoading(true);
    const { error: err } = await auth.signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(arabicError(err));
    else toast.success("أهلاً بك من جديد");
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <ThemeToggle className="absolute end-4 top-4" />
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lift">
            <GraduationCap className="size-8" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-ink">مُعلّمي</h1>
          <p className="mt-2 text-muted">تابع طلابك ودروسك وتقدّمهم في مكان واحد</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-semibold text-ink">تسجيل الدخول</h2>
          {isDemoMode && (
            <p className="rounded-xl bg-sage-light px-4 py-3 text-sm text-primary">
              وضع تجريبي: أدخل أي بريد إلكتروني وكلمة مرور للدخول وتجربة التطبيق ببيانات تجريبية.
            </p>
          )}
          <Field label="البريد الإلكتروني" htmlFor="email">
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                className="pr-10 text-right"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </Field>
          <Field label="كلمة المرور" htmlFor="password">
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                className="pr-10 text-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </Field>
          {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            دخول
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">هذا التطبيق خاص بالمعلّم فقط، وجميع البيانات محمية.</p>
      </div>
    </div>
  );
}
