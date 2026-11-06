import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-card shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  icon,
  action,
  className,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center justify-between gap-3 rounded-t-2xl border-b border-line bg-gradient-to-l from-sage-light to-card px-5 py-4",
        className,
      )}
    >
      <h2 className="flex items-center gap-2.5 text-base font-bold text-ink">
        {icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white [&_svg]:size-4">{icon}</span>
        )}
        {title}
      </h2>
      {action}
    </div>
  );
}
