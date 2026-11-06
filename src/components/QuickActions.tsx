import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LessonFormDialog, type LessonPreset } from "./forms/LessonForm";
import { StudentFormDialog } from "./forms/StudentForm";
import type { Student } from "@/lib/types";

interface QuickActions {
  openLesson: (preset?: LessonPreset) => void;
  openStudent: (student?: Student) => void;
}

const QuickActionsContext = createContext<QuickActions | null>(null);

/** Hosts the two app-wide dialogs (record lesson, add/edit student) so any page can open them. */
export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonPreset, setLessonPreset] = useState<LessonPreset>({});
  const [studentOpen, setStudentOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  const openLesson = useCallback((preset: LessonPreset = {}) => {
    setLessonPreset(preset);
    setLessonOpen(true);
  }, []);
  const openStudent = useCallback((s?: Student) => {
    setStudent(s ?? null);
    setStudentOpen(true);
  }, []);

  const value = useMemo(() => ({ openLesson, openStudent }), [openLesson, openStudent]);

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <LessonFormDialog open={lessonOpen} onOpenChange={setLessonOpen} preset={lessonPreset} />
      <StudentFormDialog open={studentOpen} onOpenChange={setStudentOpen} student={student} />
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions must be used inside QuickActionsProvider");
  return ctx;
}
