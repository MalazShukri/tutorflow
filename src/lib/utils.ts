import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat("ar-EG-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("ar-EG-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "short",
});

/** Parses "YYYY-MM-DD" as a local date (avoids timezone shifts). */
function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatDate(value: string | null | undefined, short = false) {
  if (!value) return "—";
  return (short ? shortDateFormatter : dateFormatter).format(parseDate(value));
}

export function relativeDay(value: string | null | undefined) {
  if (!value) return "لم يُسجَّل درس بعد";
  const date = parseDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days === 2) return "قبل يومين";
  if (days > 2 && days <= 10) return `قبل ${days} أيام`;
  if (days < 0) return formatDate(value);
  return formatDate(value);
}

export function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Trims a string and turns empty values into null for nullable DB columns. */
export function clean(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v === "" ? null : v;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

/** Maps Supabase/Postgres errors to Arabic messages for the user. */
export function arabicError(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  const msg = e?.message ?? "";
  if (e?.code === "23505") return "هذا العنصر موجود مسبقاً.";
  if (e?.code === "23503") return "لا يمكن إتمام العملية لارتباط هذا العنصر ببيانات أخرى.";
  if (e?.code === "23514") return "بعض القيم المدخلة غير صالحة. يرجى مراجعة الحقول.";
  if (e?.code === "42501" || /row-level security/i.test(msg)) return "ليست لديك صلاحية لتنفيذ هذه العملية.";
  if (/Invalid login credentials/i.test(msg)) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (/Email not confirmed/i.test(msg)) return "لم يتم تأكيد البريد الإلكتروني بعد.";
  if (/Password should be/i.test(msg)) return "كلمة المرور قصيرة جداً (6 أحرف على الأقل).";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";
  if (/JWT|session/i.test(msg)) return "انتهت الجلسة. يرجى تسجيل الدخول من جديد.";
  return "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
}

/** Week as shown in the app, Saturday first. `day` uses JS numbering (0 = Sunday). */
export const WEEKDAYS = [
  { day: 6, label: "السبت" },
  { day: 0, label: "الأحد" },
  { day: 1, label: "الاثنين" },
  { day: 2, label: "الثلاثاء" },
  { day: 3, label: "الأربعاء" },
  { day: 4, label: "الخميس" },
  { day: 5, label: "الجمعة" },
];

export function dayLabel(day: number) {
  return WEEKDAYS.find((w) => w.day === day)?.label ?? "";
}

const timeFormat = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "numeric", minute: "2-digit" });

/** "16:30" → "4:30 م". */
export function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  return timeFormat.format(new Date(2000, 0, 1, h, m));
}

/** "4:00 م – 5:30 م", or just one side when the other is empty. */
export function formatTimeRange(t: { from: string | null; to: string | null } | undefined) {
  if (!t || (!t.from && !t.to)) return "";
  if (t.from && t.to) return `${formatTime(t.from)} – ${formatTime(t.to)}`;
  return t.from ? `من ${formatTime(t.from)}` : `حتى ${formatTime(t.to!)}`;
}
