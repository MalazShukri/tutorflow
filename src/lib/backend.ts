import { isSupabaseConfigured, supabase } from "./supabase";
import { mockBackend } from "./mock";
import type { Grade, LessonWithRefs, Student, StudentSubject, StudentSubjectWithRefs, Subject, Lesson } from "./types";

/** Demo mode runs entirely in the browser with sample data (no Supabase needed). */
export const isDemoMode = !isSupabaseConfigured || import.meta.env.VITE_DEMO_MODE === "true";

export type StudentInput = Pick<Student, "name" | "grade" | "address" | "guardian_phone" | "notes">;
export type ProgressInput = Pick<StudentSubject, "current_chapter" | "last_completed_topic" | "next_topic" | "progress_notes">;
export type LessonInput = Pick<
  Lesson,
  "student_subject_id" | "lesson_date" | "chapter" | "topic" | "notes" | "homework" | "next_topic"
> & { student_id: string };

export interface LessonFilters {
  studentId?: string;
  studentSubjectId?: string;
  subjectId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Every data operation the app uses. Implemented by Supabase and by the in-browser demo store. */
export interface Backend {
  listStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | null>;
  /** Creates/updates a student; on create, `subjectId` also assigns that subject. */
  saveStudent(id: string | undefined, values: StudentInput, subjectId?: string): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  listSubjects(): Promise<Subject[]>;
  saveSubject(id: string | undefined, name: string): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;
  /** Makes one subject the default (or clears it with null). */
  setDefaultSubject(id: string | null): Promise<void>;

  listGrades(): Promise<Grade[]>;
  /** Renaming a grade also renames it on students in that grade. */
  saveGrade(id: string | undefined, name: string, sortOrder?: number): Promise<void>;
  deleteGrade(id: string): Promise<void>;

  listStudentSubjects(studentId?: string): Promise<StudentSubjectWithRefs[]>;
  getStudentSubject(id: string): Promise<StudentSubjectWithRefs | null>;
  addStudentSubject(values: { student_id: string; subject_id: string } & Partial<ProgressInput>): Promise<StudentSubject>;
  updateProgress(id: string, values: ProgressInput): Promise<void>;
  deleteStudentSubject(id: string): Promise<void>;

  listLessons(filters: LessonFilters): Promise<LessonWithRefs[]>;
  saveLesson(id: string | undefined, values: LessonInput): Promise<void>;
  deleteLesson(id: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Supabase implementation                                             */
/* ------------------------------------------------------------------ */

function unwrap<T>({ data, error }: { data: unknown; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

const LESSON_SELECT = "*, student:students(id,name), student_subject:student_subjects(id, subject_id, subject:subjects(id,name))";
const SS_SELECT = "*, subject:subjects(id,name), student:students(id,name)";

const supabaseBackend: Backend = {
  async listStudents() {
    return unwrap(await supabase.from("students").select("*").order("created_at", { ascending: false }));
  },
  async getStudent(id) {
    return unwrap(await supabase.from("students").select("*").eq("id", id).maybeSingle());
  },
  async saveStudent(id, values, subjectId) {
    const q = id
      ? supabase.from("students").update(values).eq("id", id).select().single()
      : supabase.from("students").insert(values).select().single();
    const student = unwrap<Student>(await q);
    if (!id && subjectId) {
      unwrap(await supabase.from("student_subjects").insert({ student_id: student.id, subject_id: subjectId }));
    }
    return student;
  },
  async deleteStudent(id) {
    unwrap(await supabase.from("students").delete().eq("id", id));
  },

  async listSubjects() {
    return unwrap(await supabase.from("subjects").select("*").order("created_at"));
  },
  async saveSubject(id, name) {
    const q = id
      ? supabase.from("subjects").update({ name }).eq("id", id).select().single()
      : supabase.from("subjects").insert({ name }).select().single();
    return unwrap(await q);
  },
  async deleteSubject(id) {
    unwrap(await supabase.from("subjects").delete().eq("id", id));
  },
  async setDefaultSubject(id) {
    // Clear first: a unique index allows only one default per teacher.
    unwrap(await supabase.from("subjects").update({ is_default: false }).eq("is_default", true));
    if (id) unwrap(await supabase.from("subjects").update({ is_default: true }).eq("id", id));
  },

  async listGrades() {
    return unwrap(await supabase.from("grades").select("*").order("sort_order").order("created_at"));
  },
  async saveGrade(id, name, sortOrder) {
    const q = id
      ? supabase.from("grades").update({ name }).eq("id", id)
      : supabase.from("grades").insert({ name, sort_order: sortOrder ?? 0 });
    unwrap(await q);
  },
  async deleteGrade(id) {
    unwrap(await supabase.from("grades").delete().eq("id", id));
  },

  async listStudentSubjects(studentId) {
    let q = supabase.from("student_subjects").select(SS_SELECT);
    q = studentId ? q.eq("student_id", studentId).order("created_at") : q.order("updated_at", { ascending: false });
    return unwrap(await q);
  },
  async getStudentSubject(id) {
    return unwrap(await supabase.from("student_subjects").select(SS_SELECT).eq("id", id).maybeSingle());
  },
  async addStudentSubject(values) {
    return unwrap(await supabase.from("student_subjects").insert(values).select().single());
  },
  async updateProgress(id, values) {
    unwrap(await supabase.from("student_subjects").update(values).eq("id", id));
  },
  async deleteStudentSubject(id) {
    unwrap(await supabase.from("student_subjects").delete().eq("id", id));
  },

  async listLessons(filters) {
    let q = supabase
      .from("lessons")
      .select(filters.subjectId ? LESSON_SELECT.replace("student_subjects(", "student_subjects!inner(") : LESSON_SELECT)
      .order("lesson_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (filters.studentId) q = q.eq("student_id", filters.studentId);
    if (filters.studentSubjectId) q = q.eq("student_subject_id", filters.studentSubjectId);
    if (filters.subjectId) q = q.eq("student_subject.subject_id", filters.subjectId);
    if (filters.from) q = q.gte("lesson_date", filters.from);
    if (filters.to) q = q.lte("lesson_date", filters.to);
    if (filters.limit) q = q.limit(filters.limit);
    return unwrap(await q);
  },
  async saveLesson(id, values) {
    const q = id ? supabase.from("lessons").update(values).eq("id", id) : supabase.from("lessons").insert(values);
    unwrap(await q);
  },
  async deleteLesson(id) {
    unwrap(await supabase.from("lessons").delete().eq("id", id));
  },
};

export const backend: Backend = isDemoMode ? mockBackend : supabaseBackend;
