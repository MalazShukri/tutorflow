import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, FlaskConical, GraduationCap, History, LogOut, Menu, NotebookPen, Settings, Users, X } from "lucide-react";
import { auth, useAuth } from "@/hooks/auth";
import { ThemeToggle } from "@/hooks/theme";
import { isDemoMode } from "@/lib/backend";
import { useQuickActions } from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "جدول اليوم", icon: CalendarDays, end: true },
  { to: "/students", label: "الطلاب", icon: Users },
  { to: "/lessons", label: "سجل الدروس", icon: History },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl shadow-sm",
          onDark ? "bg-white/15 text-white ring-1 ring-white/20" : "bg-primary text-white",
        )}
      >
        <GraduationCap className="size-[22px]" />
      </span>
      <div>
        <div className={cn("text-lg font-bold leading-tight", onDark ? "text-white" : "text-ink")}>مُعلّمي</div>
        <div className={cn("text-xs", onDark ? "text-white/60" : "text-muted")}>متابعة الطلاب والدروس</div>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav className="space-y-1">
      <div className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-white/45">القائمة</div>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
              (to === "/students" ? /^\/(students|progress)/.test(location.pathname) : isActive)
                ? "bg-white text-[#176B63] shadow-sm before:absolute before:inset-y-2.5 before:-start-4 before:w-1 before:rounded-e-full before:bg-accent"
                : "text-white/75 hover:bg-white/10 hover:text-white",
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useAuth();
  const { openLesson } = useQuickActions();
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand onDark />
      <div className="h-px bg-white/10" />
      <Button
        size="lg"
        variant="accent"
        className="w-full shadow-md"
        onClick={() => {
          onNavigate?.();
          openLesson();
        }}
      >
        <NotebookPen />
        تسجيل درس جديد
      </Button>
      <NavItems onNavigate={onNavigate} />
      {isDemoMode && (
        <div className="mt-auto flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-[#FFD9CE]">
          <FlaskConical className="size-4 shrink-0" />
          وضع تجريبي — البيانات محفوظة في هذا المتصفح فقط
        </div>
      )}
      <div className={cn("rounded-xl bg-black/15 p-3", !isDemoMode && "mt-auto")}>
        <div className="truncate text-xs text-white/60" dir="ltr" title={session?.user.email}>
          {session?.user.email}
        </div>
        <ThemeToggle withLabel className="mt-1 text-white/80 hover:bg-white/10 hover:text-white" />
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start px-2 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => auth.signOut()}
        >
          <LogOut />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar (right side in RTL) */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 bg-gradient-to-b from-sidebar-from to-sidebar-to lg:block">
        <SidebarBody />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-gradient-to-l from-sidebar-from to-sidebar-to px-4 shadow-md lg:hidden">
        <Brand onDark />
        <div className="flex gap-1">
          <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            aria-label="القائمة"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-gradient-to-b from-sidebar-from to-sidebar-to shadow-lift animate-slide-in">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute end-3 top-5 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="إغلاق القائمة"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </Button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:ps-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
  /** Shown in a colored tile before the title. */
  icon?: ReactNode;
}) {
  return (
    <div className="mb-7 border-b border-mist-ring pb-5">
      {back}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon && (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md [&_svg]:size-6">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Heading that opens a section of a page: colored bar, icon, optional count and action. */
export function SectionTitle({
  title,
  icon,
  count,
  action,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-ink">
        <span className="h-6 w-1.5 rounded-full bg-accent" aria-hidden />
        {icon && <span className="text-primary [&_svg]:size-5">{icon}</span>}
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-mist-deep ring-1 ring-mist-ring">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

/** Tinted panel that groups a section title with its cards. */
export function Section({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-3xl bg-mist p-4 ring-1 ring-mist-ring sm:p-5", className)}>{children}</section>
  );
}
