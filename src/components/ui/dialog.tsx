import type { ReactNode } from "react";
import * as D from "@radix-ui/react-dialog";
import * as AD from "@radix-ui/react-alert-dialog";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

const overlay = "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in";
// Centred with physical left/top so RTL does not flip the transform.
const content =
  "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-card shadow-lift focus:outline-none data-[state=open]:animate-zoom-in";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export function Dialog({ open, onOpenChange, title, description, icon, children, footer, size = "md" }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content dir="rtl" className={cn(content, size === "lg" ? "max-w-2xl" : "max-w-lg")}>
          <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
            {icon && (
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-primary [&_svg]:size-[18px]">
                {icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <D.Title className="text-lg font-semibold text-ink">{title}</D.Title>
              <D.Description className={description ? "mt-0.5 text-sm text-muted" : "sr-only"}>
                {description ?? title}
              </D.Description>
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="إغلاق">
                <X />
              </Button>
            </D.Close>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
              {footer}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "حذف",
  loading,
  onConfirm,
}: ConfirmProps) {
  return (
    <AD.Root open={open} onOpenChange={onOpenChange}>
      <AD.Portal>
        <AD.Overlay className={overlay} />
        <AD.Content dir="rtl" className={cn(content, "max-w-md p-6")}>
          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <AD.Title className="text-lg font-semibold text-ink">{title}</AD.Title>
              <AD.Description className="mt-1.5 text-sm leading-relaxed text-muted">{description}</AD.Description>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AD.Cancel asChild>
              <Button variant="outline">إلغاء</Button>
            </AD.Cancel>
            <Button variant="danger" loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  );
}
