export const CMS_ADMIN = {
  id: "cms-001",
  name: "Vikram Patel",
  email: "vikram@edubattle.in",
  initials: "VP",
  color: "#0A1628",
  role: "Content Manager",
};

export const CMS_STATS = {
  totalQuestions: 24870,
  activeSchools: 143,
  activeStudents: 28400,
  quizzesPlayed: 184200,
  coveragePercent: 67,
  pendingReview: 3,
  questionsThisMonth: 1240,
  aiQuestionsThisMonth: 340,
};

export const CONTENT_LIBRARY = [
  { id: "ck-001", title: "Fractions & Decimals — NCERT Class 8", subject: "Mathematics", grade: 8, chapter: "Chapter 1", questions: 45, status: "PUBLISHED", source: "PREBUILT", createdAt: "2025-11-01", reviewScore: 98, tags: ["fractions", "decimals", "class8"] },
  { id: "ck-002", title: "Photosynthesis — NCERT Class 7 Science", subject: "Science", grade: 7, chapter: "Chapter 1", questions: 38, status: "PUBLISHED", source: "PREBUILT", createdAt: "2025-11-05", reviewScore: 96, tags: ["photosynthesis", "class7", "nutrition"] },
  { id: "ck-003", title: "French Revolution — Class 9 History", subject: "Social Studies", grade: 9, chapter: "Chapter 1", questions: 42, status: "PENDING_REVIEW", source: "AI", createdAt: "2026-03-20", reviewScore: null, tags: ["history", "revolution", "class9"] },
  { id: "ck-004", title: "Trigonometry Basics — Class 10", subject: "Mathematics", grade: 10, chapter: "Chapter 8", questions: 50, status: "PENDING_REVIEW", source: "MANUAL", createdAt: "2026-03-21", reviewScore: null, tags: ["trig", "class10"] },
  { id: "ck-005", title: "Light & Reflection — Class 10 Physics", subject: "Science", grade: 10, chapter: "Chapter 10", questions: 40, status: "PUBLISHED", source: "PREBUILT", createdAt: "2025-12-01", reviewScore: 94, tags: ["light", "reflection", "class10"] },
  { id: "ck-006", title: "Democracy & Constitution — Class 9 Civics", subject: "Social Studies", grade: 9, chapter: "Chapter 2", questions: 35, status: "DRAFT", source: "MANUAL", createdAt: "2026-03-22", reviewScore: null, tags: ["civics", "democracy", "class9"] },
];

export const NCERT_COVERAGE = [
  { subject: "Mathematics", grade: 6, chapters: 14, covered: 12, percent: 86 },
  { subject: "Mathematics", grade: 7, chapters: 15, covered: 13, percent: 87 },
  { subject: "Mathematics", grade: 8, chapters: 16, covered: 14, percent: 88 },
  { subject: "Mathematics", grade: 9, chapters: 15, covered: 11, percent: 73 },
  { subject: "Mathematics", grade: 10, chapters: 15, covered: 10, percent: 67 },
  { subject: "Mathematics", grade: 11, chapters: 16, covered: 8, percent: 50 },
  { subject: "Mathematics", grade: 12, chapters: 13, covered: 6, percent: 46 },
  { subject: "Science", grade: 6, chapters: 16, covered: 14, percent: 88 },
  { subject: "Science", grade: 7, chapters: 18, covered: 15, percent: 83 },
  { subject: "Science", grade: 8, chapters: 18, covered: 13, percent: 72 },
  { subject: "Science", grade: 9, chapters: 15, covered: 9, percent: 60 },
  { subject: "Science", grade: 10, chapters: 16, covered: 9, percent: 56 },
  { subject: "Social Studies", grade: 6, chapters: 8, covered: 6, percent: 75 },
  { subject: "Social Studies", grade: 7, chapters: 10, covered: 7, percent: 70 },
  { subject: "Social Studies", grade: 8, chapters: 10, covered: 6, percent: 60 },
  { subject: "Social Studies", grade: 9, chapters: 12, covered: 5, percent: 42 },
  { subject: "Social Studies", grade: 10, chapters: 12, covered: 4, percent: 33 },
  { subject: "English", grade: 6, chapters: 10, covered: 9, percent: 90 },
  { subject: "English", grade: 7, chapters: 10, covered: 9, percent: 90 },
  { subject: "English", grade: 8, chapters: 10, covered: 8, percent: 80 },
  { subject: "English", grade: 9, chapters: 11, covered: 7, percent: 64 },
  { subject: "English", grade: 10, chapters: 11, covered: 6, percent: 55 },
];

export const REVIEW_QUEUE = [
  { id: "rev-001", contentId: "ck-003", title: "French Revolution — Class 9 History", subject: "Social Studies", grade: 9, questions: 42, source: "AI", submittedBy: "AI System", submittedAt: "2026-03-20T14:00:00", priority: "HIGH" },
  { id: "rev-002", contentId: "ck-004", title: "Trigonometry Basics — Class 10", subject: "Mathematics", grade: 10, questions: 50, source: "MANUAL", submittedBy: "Priya Kapoor", submittedAt: "2026-03-21T10:00:00", priority: "MEDIUM" },
  { id: "rev-003", contentId: "ck-006", title: "Democracy & Constitution — Class 9", subject: "Social Studies", grade: 9, questions: 35, source: "MANUAL", submittedBy: "Arjun Mehta", submittedAt: "2026-03-22T09:00:00", priority: "LOW" },
];

export const REVIEW_CHECKLIST_ITEMS = [
  { id: "chk-001", label: "Language is age-appropriate for the grade level", category: "Quality" },
  { id: "chk-002", label: "Questions align with NCERT syllabus objectives", category: "Curriculum" },
  { id: "chk-003", label: "Correct answer is definitively correct", category: "Accuracy" },
  { id: "chk-004", label: "Distractors are plausible but clearly wrong", category: "Quality" },
  { id: "chk-005", label: "Explanation is clear and educationally valuable", category: "Quality" },
  { id: "chk-006", label: "No ambiguous or double-meaning questions", category: "Clarity" },
  { id: "chk-007", label: "No factual errors detected", category: "Accuracy" },
  { id: "chk-008", label: "Difficulty level matches metadata tag", category: "Tagging" },
];

export const SCHOOL_MANAGEMENT = [
  { id: "sch-001", name: "Delhi Public School, Vijayawada", plan: "Growth", students: 486, teachers: 24, activeAssignments: 8, joinedDate: "2025-08-01", status: "ACTIVE", mrr: 12000 },
  { id: "sch-002", name: "Kendriya Vidyalaya, Hyderabad", plan: "Scale", students: 892, teachers: 45, activeAssignments: 23, joinedDate: "2025-06-15", status: "ACTIVE", mrr: 25000 },
  { id: "sch-003", name: "Ryan International, Mumbai", plan: "Growth", students: 523, teachers: 28, activeAssignments: 12, joinedDate: "2025-09-01", status: "ACTIVE", mrr: 12000 },
  { id: "sch-004", name: "DAV Public School, Chennai", plan: "Starter", students: 234, teachers: 15, activeAssignments: 5, joinedDate: "2025-11-01", status: "ACTIVE", mrr: 5000 },
  { id: "sch-005", name: "Narayana School, Bangalore", plan: "Scale", students: 1243, teachers: 67, activeAssignments: 34, joinedDate: "2025-05-01", status: "ACTIVE", mrr: 35000 },
];
