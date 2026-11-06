export interface Grade {
  id: string;
  name: string;
  sort_order: number;
}

export interface Subject {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string | null;
  address: string | null;
  guardian_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  current_chapter: string | null;
  last_completed_topic: string | null;
  next_topic: string | null;
  progress_notes: string | null;
  last_lesson_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentSubjectWithRefs extends StudentSubject {
  subject: Pick<Subject, "id" | "name">;
  student: Pick<Student, "id" | "name">;
}

export interface Lesson {
  id: string;
  student_id: string;
  student_subject_id: string;
  lesson_date: string;
  chapter: string | null;
  topic: string;
  notes: string | null;
  homework: string | null;
  next_topic: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonWithRefs extends Lesson {
  student: Pick<Student, "id" | "name">;
  student_subject: { id: string; subject_id: string; subject: Pick<Subject, "id" | "name"> };
}
