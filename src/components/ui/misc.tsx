import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

export function Badge({
  tone = "sage",
  className,
  children,
}: {
  tone?: "sage" | "coral" | "gray";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    sage: "bg-sage text-primary",
    coral: "bg-accent-soft text-accent-deep",
    gray: "bg-line text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-line", className)} />;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-sm",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-sage/50 blur-xl" />
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-sage text-primary [&_svg]:size-7">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-danger-soft px-5 py-6 text-center text-sm text-danger">
      تعذّر تحميل البيانات.
      {onRetry && (
        <button onClick={onRetry} className="ms-2 font-semibold underline underline-offset-4">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-5 pb-5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}

/** Subject name pill. */
export function SubjectBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold text-primary",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      {name}
    </span>
  );
}
