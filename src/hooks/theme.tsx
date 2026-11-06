import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tutorflow-theme";
const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore: theme then lasts for this page only */
  }
  listeners.forEach((fn) => fn());
}

/** Current theme; the initial class is set by the inline script in index.html to avoid a flash. */
export function useTheme() {
  const theme = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    current,
  );
  return { theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

/** Light/dark switch. `withLabel` shows the text (sidebar); otherwise icon only. */
export function ThemeToggle({ withLabel, className }: { withLabel?: boolean; className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "الوضع النهاري" : "الوضع الليلي";
  return (
    <Button
      variant="ghost"
      size={withLabel ? "sm" : "icon"}
      className={cn(withLabel && "w-full justify-start px-2", className)}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
      {withLabel && label}
    </Button>
  );
}
