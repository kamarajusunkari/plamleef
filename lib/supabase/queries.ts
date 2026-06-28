/**
 * Supabase query helpers — mapped to the real EduBattle V2 schema
 * Project: izelmscyynvkprlvhuin (ap-south-1)
 *
 * Schema tables (all in public schema):
 *   users, schools, students, teachers, classes, subjects, class_subjects,
 *   student_records, quiz, assignment, question, assignment_attempts,
 *   assignment_answers, student_xp, xp_logs, attendance, doubts,
 *   announcements, leaderboards
 */

import { createClient } from "./server";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH / USER
// ─────────────────────────────────────────────────────────────────────────────

/** Get the logged-in user's profile from the `users` table */
export async function getCurrentUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, photo, role, created_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a student's full profile including their current class and XP.
 * Joins: students → student_records (is_current) → classes → student_xp
 */
export async function getStudentProfile(userId: string) {
  const supabase = await createClient();

  // Get student row
  const { data: student, error: sErr } = await supabase
    .from("students")
    .select(`
      id, registration_no, school_id, created_at,
      users ( id, name, email, photo )
    `)
    .eq("user_id", userId)
    .single();
  if (sErr) throw sErr;

  // Get current class via student_records
  const { data: record } = await supabase
    .from("student_records")
    .select(`id, academic_year, classes ( id, name, section )`)
    .eq("student_id", student.id)
    .eq("is_current", true)
    .single();

  // Get XP
  const { data: xpRow } = await supabase
    .from("student_xp")
    .select("total_xp")
    .eq("student_records_id", record?.id ?? "")
    .single();

  return { ...student, currentRecord: record, totalXp: xpRow?.total_xp ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all assignments for a student's class that are ACTIVE,
 * joined with the quiz details and the student's attempt (if any).
 */
export async function getStudentAssignments(studentRecordId: string, classId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignment")
    .select(`
      id, title, mode, duedate, status, created_at,
      quiz ( id, title, topic, subtopic, subject_id, difficulty, time, count,
             subjects ( name ) ),
      assignment_attempts ( id, score, xp_earned, correct_count, created_at )
    `)
    .eq("class_id", classId)
    .eq("status", "ACTIVE")
    .order("duedate", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get all questions for a quiz (to run it in the UI)
 */
export async function getQuizQuestions(quizId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question")
    .select("id, question, options, answer, type, explanation")
    .eq("quiz_id", quizId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/**
 * Submit a quiz attempt with per-answer breakdown
 */
export async function submitQuizAttempt(payload: {
  assignmentId: string;
  studentRecordId: string;
  score: number;
  performance: number;       // percentage 0-100
  xpEarned: number;
  correctCount: number;
  timeTaken: number;          // seconds
  answers: Array<{
    questionId: string;
    selectedOptions: string[];
    isCorrect: boolean;
  }>;
}) {
  const supabase = await createClient();

  // 1. Insert attempt
  const { data: attempt, error: aErr } = await supabase
    .from("assignment_attempts")
    .insert({
      assignment_id: payload.assignmentId,
      student_records_id: payload.studentRecordId,
      score: payload.score,
      performance: payload.performance,
      xp_earned: payload.xpEarned,
      correct_count: payload.correctCount,
      time_taken: payload.timeTaken,
    })
    .select("id")
    .single();
  if (aErr) throw aErr;

  // 2. Insert per-answer rows
  const answerRows = payload.answers.map(a => ({
    attempt_id: attempt.id,
    question_id: a.questionId,
    selected_options: a.selectedOptions,
    is_correct: a.isCorrect,
  }));
  const { error: aaErr } = await supabase.from("assignment_answers").insert(answerRows);
  if (aaErr) throw aaErr;

  // 3. Update student XP
  const { error: xpErr } = await supabase.rpc("increment_xp", {
    p_student_records_id: payload.studentRecordId,
    p_xp: payload.xpEarned,
  });
  // Note: create the increment_xp function in SQL editor (see below)
  // For now, fall back to a manual update if RPC not yet created:
  if (xpErr) {
    await supabase
      .from("student_xp")
      .update({ total_xp: supabase.rpc as never })   // placeholder — use RPC in production
      .eq("student_records_id", payload.studentRecordId);
  }

  // 4. Log XP event
  await supabase.from("xp_logs").insert({
    student_records_id: payload.studentRecordId,
    xp: payload.xpEarned,
    source: "ASSIGNMENT",
  });

  return attempt.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOUBTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentDoubts(studentRecordId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doubts")
    .select(`
      id, content, answer, status, created_at, answered_at,
      subjects ( name ),
      teachers ( id, users ( name ) )
    `)
    .eq("student_records_id", studentRecordId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function postDoubt(payload: {
  studentRecordId: string;
  teacherId: string;
  subjectId: string;
  content: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("doubts").insert({
    student_records_id: payload.studentRecordId,
    teacher_id: payload.teacherId,
    subject_id: payload.subjectId,
    content: payload.content,
    status: "OPEN",
  });
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

export async function getClassLeaderboard(classId: string, period = "WEEKLY") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboards")
    .select(`
      rank, score, xp, games_played, games_won, accuracy_pct, updated_at,
      student_records (
        students ( id, users ( name, photo ) )
      )
    `)
    .eq("class_id", classId)
    .eq("period", period)
    .order("rank", { ascending: true })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentAttendance(studentRecordId: string, month?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("attendance")
    .select("id, date, status, note")
    .eq("student_records_id", studentRecordId)
    .order("date", { ascending: true });

  if (month) {
    // e.g. month = "2026-03"
    query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getSchoolAnnouncements(schoolId: string, classId?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, content, audience, is_pinned, expires_at, created_at, created_by")
    .eq("school_id", schoolId)
    .or(classId ? `target_class_id.cs.{${classId}}` : "is_pinned.eq.true")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER
// ─────────────────────────────────────────────────────────────────────────────

export async function getTeacherClasses(teacherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_subjects")
    .select(`
      id,
      classes ( id, name, section ),
      subjects ( id, name )
    `)
    .eq("teacher_id", teacherId);
  if (error) throw error;
  return data ?? [];
}

export async function getTeacherQuizzes(teacherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz")
    .select(`
      id, title, topic, subtopic, difficulty, time, count, created_at,
      subjects ( name ),
      classes ( name, section )
    `)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuiz(payload: {
  teacherId: string;
  classId: string;
  subjectId: string;
  schoolId: string;
  title: string;
  topic: string;
  subtopic?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timePerQuestion: number;
  questionCount: number;
  questions: Array<{
    question: string;
    options: string[];
    answer: string[];
    type: string;
    explanation?: string;
  }>;
}) {
  const supabase = await createClient();

  // 1. Create quiz
  const { data: quiz, error: qErr } = await supabase
    .from("quiz")
    .insert({
      teacher_id: payload.teacherId,
      class_id: payload.classId,
      subject_id: payload.subjectId,
      school_id: payload.schoolId,
      title: payload.title,
      topic: payload.topic,
      subtopic: payload.subtopic,
      difficulty: payload.difficulty,
      time: payload.timePerQuestion,
      count: payload.questionCount,
      source: "TEACHER",
      creation_type: "MANUAL",
    })
    .select("id")
    .single();
  if (qErr) throw qErr;

  // 2. Insert questions
  const questionRows = payload.questions.map(q => ({
    quiz_id: quiz.id,
    question: q.question,
    options: q.options,
    answer: q.answer,
    type: q.type,
    explanation: q.explanation,
  }));
  const { error: qqErr } = await supabase.from("question").insert(questionRows);
  if (qqErr) throw qqErr;

  return quiz.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// XP
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeeklyXpLogs(studentRecordId: string) {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("xp_logs")
    .select("xp, source, created_at")
    .eq("student_records_id", studentRecordId)
    .gte("created_at", sevenDaysAgo)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
