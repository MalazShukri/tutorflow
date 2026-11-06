import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { backend, type LessonFilters, type LessonInput, type ProgressInput, type StudentInput } from "./backend";
import { arabicError } from "./utils";

export type { LessonFilters, LessonInput, ProgressInput, StudentInput } from "./backend";

export const keys = {
  all: ["data"] as const,
  students: ["data", "students"] as const,
  student: (id: string) => ["data", "student", id] as const,
  subjects: ["data", "subjects"] as const,
  grades: ["data", "grades"] as const,
  studentSubjects: (studentId?: string) => ["data", "student-subjects", studentId ?? "all"] as const,
  studentSubject: (id: string) => ["data", "student-subject", id] as const,
  lessons: (filters: object) => ["data", "lessons", filters] as const,
};

/** Every mutation invalidates all data queries: the dataset is small and this keeps every view consistent. */
function useMutate<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  successMessage?: string | ((vars: TVars) => string),
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: keys.all });
      if (successMessage) toast.success(typeof successMessage === "function" ? successMessage(vars) : successMessage);
    },
    onError: (error) => toast.error(arabicError(error)),
  });
}

/* Students */

export function useStudents() {
  return useQuery({ queryKey: keys.students, queryFn: () => backend.listStudents() });
}

export function useStudent(id: string | undefined) {
  return useQuery({ queryKey: keys.student(id ?? ""), enabled: Boolean(id), queryFn: () => backend.getStudent(id!) });
}

export function useSaveStudent() {
  return useMutate(
    ({ id, values, subjectId }: { id?: string; values: StudentInput; subjectId?: string }) =>
      backend.saveStudent(id, values, subjectId),
    ({ id }) => (id ? "تم تحديث بيانات الطالب" : "تمت إضافة الطالب بنجاح"),
  );
}

export function useDeleteStudent() {
  return useMutate((id: string) => backend.deleteStudent(id), "تم حذف الطالب");
}

/* Subjects & grades (catalogue) */

export function useSubjects() {
  return useQuery({ queryKey: keys.subjects, queryFn: () => backend.listSubjects() });
}

export function useSaveSubject() {
  return useMutate(
    ({ id, name }: { id?: string; name: string }) => backend.saveSubject(id, name),
    ({ id }) => (id ? "تم تعديل اسم المادة" : "تمت إضافة المادة"),
  );
}

export function useDeleteSubject() {
  return useMutate((id: string) => backend.deleteSubject(id), "تم حذف المادة");
}

export function useSetDefaultSubject() {
  return useMutate(
    (id: string | null) => backend.setDefaultSubject(id),
    (id) => (id ? "تم تعيين المادة الافتراضية" : "تم إلغاء المادة الافتراضية"),
  );
}

export function useGrades() {
  return useQuery({ queryKey: keys.grades, queryFn: () => backend.listGrades() });
}

export function useSaveGrade() {
  return useMutate(
    ({ id, name, sort_order }: { id?: string; name: string; sort_order?: number }) =>
      backend.saveGrade(id, name, sort_order),
    ({ id }) => (id ? "تم تعديل الصف" : "تمت إضافة الصف"),
  );
}

export function useDeleteGrade() {
  return useMutate((id: string) => backend.deleteGrade(id), "تم حذف الصف");
}

/* Student subjects (per-subject progress) */

export function useStudentSubjects(studentId?: string) {
  return useQuery({ queryKey: keys.studentSubjects(studentId), queryFn: () => backend.listStudentSubjects(studentId) });
}

export function useStudentSubject(id: string | undefined) {
  return useQuery({
    queryKey: keys.studentSubject(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => backend.getStudentSubject(id!),
  });
}

export function useAddStudentSubject() {
  return useMutate(
    (values: { student_id: string; subject_id: string } & Partial<ProgressInput>) => backend.addStudentSubject(values),
    "تمت إضافة المادة للطالب",
  );
}

export function useUpdateProgress() {
  return useMutate(
    ({ id, values }: { id: string; values: ProgressInput }) => backend.updateProgress(id, values),
    "تم تحديث التقدّم",
  );
}

export function useDeleteStudentSubject() {
  return useMutate((id: string) => backend.deleteStudentSubject(id), "تمت إزالة المادة من الطالب");
}

/* Lessons */

export function useLessons(filters: LessonFilters = {}) {
  return useQuery({ queryKey: keys.lessons(filters), queryFn: () => backend.listLessons(filters) });
}

export function useSaveLesson() {
  return useMutate(
    ({ id, values }: { id?: string; values: LessonInput }) => backend.saveLesson(id, values),
    ({ id }) => (id ? "تم تعديل الدرس" : "تم تسجيل الدرس وتحديث التقدّم"),
  );
}

export function useDeleteLesson() {
  return useMutate((id: string) => backend.deleteLesson(id), "تم حذف الدرس");
}
