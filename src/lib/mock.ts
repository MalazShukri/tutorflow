/**
 * In-browser demo backend. Mirrors the database rules in supabase/migrations/0001_init.sql
 * (validation, unique names, cascades, per-subject progress recomputation) so the UI behaves
 * the same as with Supabase. Data is kept in localStorage.
 */
import type { Backend, LessonFilters, LessonInput, ProgressInput, StudentInput } from "./backend";
import type { Grade, Lesson, LessonWithRefs, Student, StudentSubject, StudentSubjectWithRefs, Subject } from "./types";

const STORAGE_KEY = "tutorflow-demo-v2";

interface Store {
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  studentSubjects: StudentSubject[];
  lessons: Lesson[];
}

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const GRADES = [
  "الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس",
  "الصف السابع", "الصف الثامن", "الصف التاسع", "الصف العاشر", "الصف الحادي عشر", "الصف الثاني عشر",
];

const SUBJECTS = [
  "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء", "اللغة العربية",
  "اللغة الإنجليزية", "العلوم", "التاريخ", "الجغرافيا",
];

/** Ordered syllabus per subject: [chapter, topic][] */
const SYLLABUS: Record<string, [string, string][]> = {
  "الرياضيات": [
    ["الوحدة الأولى: الأعداد", "الأعداد الحقيقية"], ["الوحدة الأولى: الأعداد", "القوى والجذور"],
    ["الوحدة الثانية: الجبر", "العبارات الجبرية"], ["الوحدة الثانية: الجبر", "تحليل كثيرات الحدود"],
    ["الوحدة الثانية: الجبر", "المعادلات من الدرجة الأولى"], ["الوحدة الثانية: الجبر", "المتراجحات"],
    ["الوحدة الثالثة: الدوال", "مفهوم الدالة"], ["الوحدة الثالثة: الدوال", "الدالة الخطية"],
    ["الوحدة الثالثة: الدوال", "الدالة التربيعية"], ["الوحدة الرابعة: الهندسة", "المثلثات المتشابهة"],
    ["الوحدة الرابعة: الهندسة", "مبرهنة فيثاغورس"],
  ],
  "الفيزياء": [
    ["الميكانيك", "الكميات القياسية والمتجهة"], ["الميكانيك", "السرعة والتسارع"],
    ["الميكانيك", "الحركة المستقيمة المنتظمة"], ["الميكانيك", "قوانين نيوتن"],
    ["الميكانيك", "الشغل والطاقة"], ["الكهرباء", "الشحنة الكهربائية"], ["الكهرباء", "قانون أوم"],
  ],
  "الكيمياء": [
    ["البنية الذرية", "مكونات الذرة"], ["البنية الذرية", "التوزيع الإلكتروني"],
    ["الجدول الدوري", "تصنيف العناصر"], ["الروابط الكيميائية", "الرابطة الأيونية"],
    ["الروابط الكيميائية", "الرابطة التساهمية"], ["التفاعلات", "موازنة المعادلات"],
  ],
  "الأحياء": [
    ["الخلية", "تركيب الخلية"], ["الخلية", "الانقسام المتساوي"], ["الوراثة", "قوانين مندل"],
    ["الوراثة", "الصفات المرتبطة بالجنس"], ["أجهزة الجسم", "الجهاز الهضمي"],
  ],
  "اللغة العربية": [
    ["النحو", "المبتدأ والخبر"], ["النحو", "كان وأخواتها"], ["النحو", "إن وأخواتها"],
    ["البلاغة", "التشبيه"], ["البلاغة", "الاستعارة"], ["الأدب", "الشعر الجاهلي"],
  ],
  "اللغة الإنجليزية": [
    ["Unit 1", "Present Simple"], ["Unit 1", "Present Continuous"], ["Unit 2", "Past Simple"],
    ["Unit 2", "Irregular Verbs"], ["Unit 3", "Future Tenses"], ["Unit 3", "Reading Comprehension"],
  ],
  "العلوم": [
    ["المادة", "حالات المادة"], ["المادة", "المخاليط والمحاليل"], ["الطاقة", "أشكال الطاقة"],
    ["الطاقة", "تحولات الطاقة"], ["الأرض", "طبقات الأرض"],
  ],
  "التاريخ": [
    ["التاريخ القديم", "حضارات بلاد الرافدين"], ["التاريخ القديم", "الحضارة الفرعونية"],
    ["التاريخ الإسلامي", "الدولة الأموية"], ["التاريخ الإسلامي", "الدولة العباسية"],
  ],
  "الجغرافيا": [
    ["الخرائط", "قراءة الخرائط"], ["المناخ", "عناصر المناخ"], ["المناخ", "الأقاليم المناخية"],
    ["السكان", "توزع السكان"],
  ],
};

const LESSON_NOTES = [
  "فهم ممتاز وحلّ التمارين بسرعة.",
  "يحتاج إلى مراجعة إضافية لهذا الموضوع.",
  "تفاعل جيد، مع بعض الأخطاء في التطبيق.",
  "تحسّن واضح مقارنة بالدرس السابق.",
  null,
  null,
];

const HOMEWORK = ["حل تمارين الصفحة 42", "مراجعة الدرس وحل ورقة العمل", "حفظ القواعد وكتابة أمثلة", null, null];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tsDaysAgo(days: number, hour = 16) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function uid() {
  return crypto.randomUUID();
}

function seed(): Store {
  const grades: Grade[] = GRADES.map((name, i) => ({ id: uid(), name, sort_order: i + 1 }));
  const subjects: Subject[] = SUBJECTS.map((name, i) => ({ id: uid(), name, is_default: i === 0, created_at: tsDaysAgo(90, i) }));
  const subjectId = (name: string) => subjects.find((s) => s.name === name)!.id;

  const people: { name: string; grade: string; address: string | null; phone: string | null; notes: string | null; stopped?: boolean; added: number; subjects: [string, number][] }[] = [
    { name: "أحمد محمد العلي", grade: "الصف التاسع", address: "دمشق، المزة، شارع الجلاء", phone: "0933 123 456", notes: "يحتاج تركيزاً إضافياً في المسائل الكلامية.", added: 60, subjects: [["الرياضيات", 6], ["الفيزياء", 4], ["الكيمياء", 2]] },
    { name: "سارة خالد حسن", grade: "الصف العاشر", address: "دمشق، المالكي", phone: "0944 222 333", notes: null, added: 52, subjects: [["الرياضيات", 10], ["اللغة الإنجليزية", 4]] },
    { name: "يوسف علي إبراهيم", grade: "الصف الثامن", address: "دمشق، ركن الدين", phone: "0955 765 432", notes: "متفوق في الحساب الذهني.", added: 45, subjects: [["الرياضيات", 4], ["العلوم", 3]] },
    { name: "لين عمر الشامي", grade: "الصف الثاني عشر", address: "دمشق، أبو رمانة", phone: "0988 111 222", notes: "تستعد لامتحان الشهادة الثانوية.", added: 40, subjects: [["الفيزياء", 6], ["الكيمياء", 5], ["الأحياء", 4]] },
    { name: "محمد سامر الحلبي", grade: "الصف السابع", address: "دمشق، الميدان", phone: null, notes: null, added: 30, subjects: [["اللغة العربية", 4], ["اللغة الإنجليزية", 3]] },
    { name: "نور هادي قاسم", grade: "الصف الحادي عشر", address: "دمشق، كفرسوسة", phone: "0932 456 789", notes: null, added: 18, subjects: [["الرياضيات", 3], ["الفيزياء", 2]] },
    { name: "ريم فادي يوسف", grade: "الصف السادس", address: null, phone: "0966 333 444", notes: "تفضّل الدروس صباحاً.", added: 6, subjects: [["العلوم", 1]] },
    { name: "كريم وائل منصور", grade: "الصف التاسع", address: "دمشق، الشعلان", phone: "0911 999 888", notes: "توقف مؤقتاً بسبب السفر.", stopped: true, added: 80, subjects: [["الرياضيات", 3], ["التاريخ", 2]] },
  ];

  const students: Student[] = [];
  const studentSubjects: StudentSubject[] = [];
  const lessons: Lesson[] = [];
  let noteIdx = 0;

  for (const p of people) {
    const student: Student = {
      id: uid(),
      name: p.name,
      grade: p.grade,
      address: p.address,
      guardian_phone: p.phone,
      notes: p.notes,
      created_at: tsDaysAgo(p.added, 12),
      updated_at: tsDaysAgo(p.added, 12),
    };
    students.push(student);

    p.subjects.forEach(([subjectName, lessonCount], si) => {
      const syllabus = SYLLABUS[subjectName];
      const ss: StudentSubject = {
        id: uid(),
        student_id: student.id,
        subject_id: subjectId(subjectName),
        current_chapter: syllabus[0][0],
        last_completed_topic: null,
        next_topic: syllabus[0][1],
        progress_notes: si === 0 && p.notes ? p.notes : null,
        last_lesson_date: null,
        created_at: tsDaysAgo(p.added, 13 + si),
        updated_at: tsDaysAgo(p.added, 13 + si),
      };
      studentSubjects.push(ss);

      // Spread lessons from when the student joined until recently (inactive students stopped earlier).
      const end = p.stopped ? 35 : si + 1;
      const span = Math.max(1, p.added - 2 - end);
      for (let i = 0; i < lessonCount && i < syllabus.length; i++) {
        const daysAgo = Math.round(p.added - 2 - (span * i) / Math.max(1, lessonCount - 1));
        const [chapter, topic] = syllabus[i];
        const next = syllabus[i + 1]?.[1] ?? null;
        lessons.push({
          id: uid(),
          student_id: student.id,
          student_subject_id: ss.id,
          lesson_date: isoDaysAgo(daysAgo),
          chapter,
          topic,
          notes: LESSON_NOTES[noteIdx++ % LESSON_NOTES.length],
          homework: HOMEWORK[noteIdx % HOMEWORK.length],
          next_topic: next,
          created_at: tsDaysAgo(daysAgo, 17),
          updated_at: tsDaysAgo(daysAgo, 17),
        });
      }
    });
  }

  const store: Store = { students, subjects, grades, studentSubjects, lessons };
  for (const ss of studentSubjects) refreshProgress(store, ss.id, false);
  return store;
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

let store: Store = load();

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* storage unavailable or corrupt: fall back to fresh sample data */
  }
  const fresh = seed();
  persist(fresh);
  return fresh;
}

function persist(s: Store = store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore: data then lives only for this page session */
  }
}

/** Replaces the demo data with fresh sample data. */
export function resetDemoData() {
  store = seed();
  persist();
}

/* ------------------------------------------------------------------ */
/* Rules mirrored from the database                                    */
/* ------------------------------------------------------------------ */

class DbError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const delay = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
const now = () => new Date().toISOString();
const clone = <T>(v: T): T => structuredClone(v);

function byLatest(a: Lesson, b: Lesson) {
  return b.lesson_date.localeCompare(a.lesson_date) || b.created_at.localeCompare(a.created_at);
}

/** Same logic as refresh_student_subject_progress(): only the given subject row changes. */
function refreshProgress(s: Store, ssId: string, touch = true) {
  const ss = s.studentSubjects.find((x) => x.id === ssId);
  if (!ss) return;
  const latest = s.lessons.filter((l) => l.student_subject_id === ssId).sort(byLatest)[0];
  if (latest) {
    ss.last_completed_topic = latest.topic;
    ss.next_topic = latest.next_topic;
    ss.current_chapter = latest.chapter?.trim() ? latest.chapter : ss.current_chapter;
    ss.last_lesson_date = latest.lesson_date;
    ss.updated_at = touch ? now() : latest.created_at;
  } else {
    ss.last_lesson_date = null;
    if (touch) ss.updated_at = now();
  }
}

function checkStudent(v: StudentInput) {
  if (!v.name.trim() || v.name.length > 120) throw new DbError("23514", "invalid name");
  if (v.guardian_phone && !/^[0-9+()\-\s]{4,25}$/.test(v.guardian_phone)) throw new DbError("23514", "invalid phone");
}

function checkName(name: string, list: { id: string; name: string }[], id?: string) {
  if (!name.trim() || name.length > 60) throw new DbError("23514", "invalid name");
  if (list.some((x) => x.name === name && x.id !== id)) throw new DbError("23505", "duplicate");
}

function newStudentSubject(studentId: string, subjectId: string): StudentSubject {
  return {
    id: uid(),
    student_id: studentId,
    subject_id: subjectId,
    current_chapter: null,
    last_completed_topic: null,
    next_topic: null,
    progress_notes: null,
    last_lesson_date: null,
    created_at: now(),
    updated_at: now(),
  };
}

function withRefs(ss: StudentSubject): StudentSubjectWithRefs {
  const subject = store.subjects.find((x) => x.id === ss.subject_id)!;
  const student = store.students.find((x) => x.id === ss.student_id)!;
  return { ...ss, subject: { id: subject.id, name: subject.name }, student: { id: student.id, name: student.name } };
}

function lessonWithRefs(l: Lesson): LessonWithRefs {
  const ss = store.studentSubjects.find((x) => x.id === l.student_subject_id)!;
  const subject = store.subjects.find((x) => x.id === ss.subject_id)!;
  const student = store.students.find((x) => x.id === l.student_id)!;
  return {
    ...l,
    student: { id: student.id, name: student.name },
    student_subject: { id: ss.id, subject_id: ss.subject_id, subject: { id: subject.id, name: subject.name } },
  };
}

/** Runs a write, persists it, and returns a copy so callers never mutate the store. */
async function write<T>(fn: () => T): Promise<T> {
  await delay();
  const result = fn();
  persist();
  return clone(result);
}

async function read<T>(fn: () => T): Promise<T> {
  await delay();
  return clone(fn());
}

/* ------------------------------------------------------------------ */
/* Backend implementation                                              */
/* ------------------------------------------------------------------ */

export const mockBackend: Backend = {
  listStudents: () => read(() => [...store.students].sort((a, b) => b.created_at.localeCompare(a.created_at))),
  getStudent: (id) => read(() => store.students.find((s) => s.id === id) ?? null),
  saveStudent: (id, values, subjectId) =>
    write(() => {
      checkStudent(values);
      if (id) {
        const s = store.students.find((x) => x.id === id);
        if (!s) throw new DbError("PGRST116", "not found");
        Object.assign(s, values, { updated_at: now() });
        return s;
      }
      const s: Student = { id: uid(), ...values, created_at: now(), updated_at: now() };
      store.students.push(s);
      if (subjectId) store.studentSubjects.push(newStudentSubject(s.id, subjectId));
      return s;
    }),
  deleteStudent: (id) =>
    write(() => {
      const ssIds = new Set(store.studentSubjects.filter((x) => x.student_id === id).map((x) => x.id));
      store.lessons = store.lessons.filter((l) => !ssIds.has(l.student_subject_id) && l.student_id !== id);
      store.studentSubjects = store.studentSubjects.filter((x) => x.student_id !== id);
      store.students = store.students.filter((x) => x.id !== id);
    }),

  listSubjects: () => read(() => [...store.subjects].sort((a, b) => a.created_at.localeCompare(b.created_at))),
  saveSubject: (id, name) =>
    write(() => {
      checkName(name, store.subjects, id);
      if (id) {
        const s = store.subjects.find((x) => x.id === id)!;
        s.name = name;
        return s;
      }
      const s: Subject = { id: uid(), name, is_default: false, created_at: now() };
      store.subjects.push(s);
      return s;
    }),
  deleteSubject: (id) =>
    write(() => {
      if (store.studentSubjects.some((x) => x.subject_id === id)) throw new DbError("23503", "subject in use");
      store.subjects = store.subjects.filter((x) => x.id !== id);
    }),
  setDefaultSubject: (id) =>
    write(() => {
      for (const s of store.subjects) s.is_default = s.id === id;
    }),

  listGrades: () => read(() => [...store.grades].sort((a, b) => a.sort_order - b.sort_order)),
  saveGrade: (id, name, sortOrder) =>
    write(() => {
      checkName(name, store.grades, id);
      if (id) {
        const g = store.grades.find((x) => x.id === id)!;
        // Same as the grades_rename_students trigger.
        for (const s of store.students) if (s.grade === g.name) s.grade = name;
        g.name = name;
      }
      else store.grades.push({ id: uid(), name, sort_order: sortOrder ?? 0 });
    }),
  deleteGrade: (id) =>
    write(() => {
      store.grades = store.grades.filter((x) => x.id !== id);
    }),

  listStudentSubjects: (studentId) =>
    read(() =>
      studentId
        ? store.studentSubjects
            .filter((x) => x.student_id === studentId)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map(withRefs)
        : [...store.studentSubjects].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(withRefs),
    ),
  getStudentSubject: (id) =>
    read(() => {
      const ss = store.studentSubjects.find((x) => x.id === id);
      return ss ? withRefs(ss) : null;
    }),
  addStudentSubject: (values) =>
    write(() => {
      if (store.studentSubjects.some((x) => x.student_id === values.student_id && x.subject_id === values.subject_id))
        throw new DbError("23505", "duplicate");
      const ss = { ...newStudentSubject(values.student_id, values.subject_id), ...values };
      store.studentSubjects.push(ss);
      return ss;
    }),
  updateProgress: (id, values: ProgressInput) =>
    write(() => {
      const ss = store.studentSubjects.find((x) => x.id === id);
      if (ss) Object.assign(ss, values, { updated_at: now() });
    }),
  deleteStudentSubject: (id) =>
    write(() => {
      store.lessons = store.lessons.filter((l) => l.student_subject_id !== id);
      store.studentSubjects = store.studentSubjects.filter((x) => x.id !== id);
    }),

  listLessons: (f: LessonFilters) =>
    read(() => {
      let rows = store.lessons.filter((l) => {
        if (f.studentId && l.student_id !== f.studentId) return false;
        if (f.studentSubjectId && l.student_subject_id !== f.studentSubjectId) return false;
        if (f.from && l.lesson_date < f.from) return false;
        if (f.to && l.lesson_date > f.to) return false;
        if (f.subjectId) {
          const ss = store.studentSubjects.find((x) => x.id === l.student_subject_id);
          if (ss?.subject_id !== f.subjectId) return false;
        }
        return true;
      });
      rows = rows.sort(byLatest);
      if (f.limit) rows = rows.slice(0, f.limit);
      return rows.map(lessonWithRefs);
    }),
  saveLesson: (id, values: LessonInput) =>
    write(() => {
      if (!values.topic.trim()) throw new DbError("23514", "topic required");
      const ss = store.studentSubjects.find((x) => x.id === values.student_subject_id);
      if (!ss) throw new DbError("23503", "student subject missing");
      // Lesson's student always follows its subject row (lessons_sync_student trigger).
      const data = { ...values, student_id: ss.student_id };
      if (id) {
        const l = store.lessons.find((x) => x.id === id)!;
        const oldSs = l.student_subject_id;
        Object.assign(l, data, { updated_at: now() });
        refreshProgress(store, l.student_subject_id);
        if (oldSs !== l.student_subject_id) refreshProgress(store, oldSs);
      } else {
        store.lessons.push({ id: uid(), ...data, created_at: now(), updated_at: now() });
        refreshProgress(store, ss.id);
      }
    }),
  deleteLesson: (id) =>
    write(() => {
      const l = store.lessons.find((x) => x.id === id);
      store.lessons = store.lessons.filter((x) => x.id !== id);
      if (l) refreshProgress(store, l.student_subject_id);
    }),
};
