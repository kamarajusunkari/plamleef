export const CURRENT_TEACHER = {
  id: "tch-001",
  name: "Mrs. S. Kumari",
  email: "s.kumari@dps.edu",
  phone: "9876543210",
  initials: "SK",
  color: "#FF6B35",
  subjects: ["Mathematics", "Science"],
  classIds: ["cls-003", "cls-005", "cls-012"],
  classes: ["Grade 7-A", "Grade 8-A", "Grade 12-A"],
  designation: "Senior Teacher",
  joinedDate: "2019-06-01",
  quizzesCreated: 47,
  totalStudents: 156,
  avgScore: 79,
  aiQuizzesMonth: 12,
};

export const TODAY_SCHEDULE = [
  { period: 1, time: "8:00–8:45", subject: "Mathematics", classId: "cls-005", className: "Grade 8-A", room: "Room 12", topic: "Fractions", students: 40, isNow: false, isDone: true },
  { period: 2, time: "8:45–9:30", subject: "Science", classId: "cls-003", className: "Grade 7-A", room: "Room 8", topic: "Photosynthesis", students: 42, isNow: true, isDone: false },
  { period: 3, time: "9:30–10:15", subject: "Mathematics", classId: "cls-012", className: "Grade 12-A", room: "Room 22", topic: "Integration", students: 34, isNow: false, isDone: false },
  { period: 4, time: "10:30–11:15", subject: "Science", classId: "cls-005", className: "Grade 8-A", room: "Room 12", topic: "Cell Division", students: 40, isNow: false, isDone: false },
  { period: 5, time: "11:15–12:00", subject: "Mathematics", classId: "cls-003", className: "Grade 7-A", room: "Room 8", topic: "Integers", students: 42, isNow: false, isDone: false },
];

export const MY_CLASSES = [
  { classId: "cls-005", name: "Grade 8-A", subject: "Mathematics", students: 40, avgScore: 79, submitted: 28, pending: 12, color: "#3B82F6", room: "Room 12", openDoubts: 2 },
  { classId: "cls-003", name: "Grade 7-A", subject: "Science", students: 42, avgScore: 74, submitted: 31, pending: 11, color: "#10B981", room: "Room 8", openDoubts: 1 },
  { classId: "cls-012", name: "Grade 12-A", subject: "Mathematics", students: 34, avgScore: 84, submitted: 34, pending: 0, color: "#8B5CF6", room: "Room 22", openDoubts: 0 },
];

export const QUIZ_LIBRARY = [
  { id: "quiz-001", title: "Fractions & Decimals", subject: "Mathematics", topic: "Fractions", grade: 8, questions: 15, difficulty: "MEDIUM", source: "PREBUILT", timesUsed: 12, avgScore: 76, timeMinutes: 20, isAI: false },
  { id: "quiz-002", title: "Integers Speed Quiz", subject: "Mathematics", topic: "Integers", grade: 7, questions: 10, difficulty: "EASY", source: "PREBUILT", timesUsed: 8, avgScore: 82, timeMinutes: 12, isAI: false },
  { id: "quiz-003", title: "Photosynthesis Deep Dive", subject: "Science", topic: "Photosynthesis", grade: 7, questions: 12, difficulty: "MEDIUM", source: "AI", timesUsed: 5, avgScore: 71, timeMinutes: 18, isAI: true },
  { id: "quiz-004", title: "Cell Structure Challenge", subject: "Science", topic: "Cell Division", grade: 8, questions: 20, difficulty: "HARD", source: "AI", timesUsed: 3, avgScore: 68, timeMinutes: 25, isAI: true },
  { id: "quiz-005", title: "Integration Basics", subject: "Mathematics", topic: "Integration", grade: 12, questions: 15, difficulty: "HARD", source: "MANUAL", timesUsed: 2, avgScore: 73, timeMinutes: 20, isAI: false },
  { id: "quiz-006", title: "HCF & LCM Practice", subject: "Mathematics", topic: "HCF/LCM", grade: 7, questions: 10, difficulty: "EASY", source: "PREBUILT", timesUsed: 9, avgScore: 80, timeMinutes: 15, isAI: false },
  { id: "quiz-007", title: "Light and Optics", subject: "Science", topic: "Light", grade: 8, questions: 15, difficulty: "MEDIUM", source: "AI", timesUsed: 4, avgScore: 74, timeMinutes: 20, isAI: true },
  { id: "quiz-008", title: "Chemical Reactions", subject: "Science", topic: "Chemistry", grade: 8, questions: 12, difficulty: "HARD", source: "PREBUILT", timesUsed: 6, avgScore: 69, timeMinutes: 18, isAI: false },
];

export const QUIZ_QUESTIONS_SAMPLE = [
  { id: "q-001", text: "What is the LCM of 12 and 18?", options: ["24", "36", "48", "72"], correct: 1, explanation: "LCM(12,18) = 36" },
  { id: "q-002", text: "Simplify: 3/4 + 1/6", options: ["4/10", "11/12", "5/12", "2/3"], correct: 1, explanation: "3/4 + 1/6 = 9/12 + 2/12 = 11/12" },
  { id: "q-003", text: "Which is greater: 0.75 or 3/5?", options: ["0.75", "3/5", "Equal", "Cannot determine"], correct: 0, explanation: "3/5 = 0.6. So 0.75 > 0.6" },
];

export const RESOURCES = [
  { id: "res-001", title: "NCERT Class 8 Mathematics Ch.1 PDF", type: "PDF", subject: "Mathematics", grade: 8, topic: "Rational Numbers", size: "2.4 MB", downloads: 142, uploadedAt: "2026-01-10", isGlobal: true },
  { id: "res-002", title: "Fractions Visual Explainer", type: "VIDEO", subject: "Mathematics", grade: 8, topic: "Fractions", size: "45 MB", downloads: 89, uploadedAt: "2026-02-03", isGlobal: false },
  { id: "res-003", title: "Photosynthesis Process Diagram", type: "IMAGE", subject: "Science", grade: 7, topic: "Photosynthesis", size: "1.2 MB", downloads: 67, uploadedAt: "2026-02-15", isGlobal: true },
  { id: "res-004", title: "Cell Division Animation", type: "VIDEO", subject: "Science", grade: 8, topic: "Cell Division", size: "88 MB", downloads: 54, uploadedAt: "2026-02-20", isGlobal: true },
  { id: "res-005", title: "Integers Practice Worksheet", type: "PDF", subject: "Mathematics", grade: 7, topic: "Integers", size: "0.8 MB", downloads: 203, uploadedAt: "2026-01-25", isGlobal: false },
  { id: "res-006", title: "Integration Formula Sheet", type: "PDF", subject: "Mathematics", grade: 12, topic: "Integration", size: "0.5 MB", downloads: 31, uploadedAt: "2026-03-01", isGlobal: false },
  { id: "res-007", title: "Light Refraction Experiment Guide", type: "PDF", subject: "Science", grade: 8, topic: "Light", size: "1.8 MB", downloads: 45, uploadedAt: "2026-02-28", isGlobal: true },
  { id: "res-008", title: "Speed Math Tricks Flashcard Set", type: "FLASHCARD", subject: "Mathematics", grade: 7, topic: "Mental Math", size: "0.3 MB", downloads: 178, uploadedAt: "2026-01-15", isGlobal: false },
];

export const TEACHER_MESSAGE_THREADS = [
  {
    id: "msg-t-001",
    parentName: "Mrs. Deepa Mehta",
    parentInitials: "DM",
    parentColor: "#3B82F6",
    studentName: "Rahul Mehta",
    className: "Grade 8-A",
    lastMessage: "Thank you for the update, ma'am",
    lastTime: "Yesterday",
    unread: 0,
    messages: [
      { id: "m-1", sender: "parent", text: "Ma'am, Rahul has been struggling with fractions. Can you guide me on how to help at home?", time: "Mon 4:12 PM" },
      { id: "m-2", sender: "teacher", text: "Hello Mrs. Mehta! Rahul is making good progress. He needs practice with mixed fractions. I recommend 20 min of practice daily using the EduBattle assignments.", time: "Mon 5:30 PM" },
      { id: "m-3", sender: "parent", text: "Thank you for the update, ma'am", time: "Mon 6:00 PM" },
    ],
  },
  {
    id: "msg-t-002",
    parentName: "Mr. Suresh Nair",
    parentInitials: "SN",
    parentColor: "#EC4899",
    studentName: "Priya Nair",
    className: "Grade 8-A",
    lastMessage: "She got 95 today! Thank you so much",
    lastTime: "Today",
    unread: 1,
    messages: [
      { id: "m-1", sender: "parent", text: "Ma'am, Priya seems bored in class. Is she being challenged enough?", time: "Tue 3:00 PM" },
      { id: "m-2", sender: "teacher", text: "Priya is absolutely exceptional. I am assigning her advanced enrichment content. No need to worry!", time: "Tue 4:00 PM" },
      { id: "m-3", sender: "parent", text: "She got 95 today! Thank you so much", time: "Today 11:00 AM" },
    ],
  },
  {
    id: "msg-t-003",
    parentName: "Mr. Vikram Sharma",
    parentInitials: "VS",
    parentColor: "#FF6B35",
    studentName: "Arjun Sharma",
    className: "Grade 8-A",
    lastMessage: "Can we schedule a call?",
    lastTime: "2h ago",
    unread: 2,
    messages: [
      { id: "m-1", sender: "parent", text: "Hello ma'am, Arjun says he finds Science too hard. Is he really at-risk?", time: "Today 9:00 AM" },
      { id: "m-2", sender: "parent", text: "Can we schedule a call?", time: "Today 10:30 AM" },
    ],
  },
];

export const TEACHER_DOUBTS = [
  { id: "dbt-001", studentId: "std-003", studentName: "Arjun Sharma", studentInitials: "AS", studentColor: "#FF6B35", className: "Grade 8-A", subject: "Mathematics", topic: "Fractions", content: "How do I multiply mixed fractions? When do I convert to improper fractions first?", answer: null, status: "OPEN", aiDraft: "To multiply mixed fractions: 1) Convert to improper fractions, 2) Multiply numerators together and denominators together, 3) Simplify. Example: 2 1/2 × 1 1/3 = 5/2 × 4/3 = 20/6 = 3 1/3", createdAt: "2026-03-22T10:30:00" },
  { id: "dbt-002", studentId: "std-006", studentName: "Kavya Reddy", studentInitials: "KR", studentColor: "#F59E0B", className: "Grade 6-A", subject: "Mathematics", topic: "LCM and HCF", content: "What is LCM and when do I use it vs HCF?", answer: null, status: "OPEN", aiDraft: "LCM (Least Common Multiple) is used when adding/subtracting fractions or finding when events coincide. HCF (Highest Common Factor) is used when dividing or distributing equally. Memory trick: LCM = Large (when combining), HCF = Half/divide.", createdAt: "2026-03-22T08:15:00" },
  { id: "dbt-003", studentId: "std-005", studentName: "Dev Kumar", studentInitials: "DK", studentColor: "#8B5CF6", className: "Grade 8-A", subject: "Mathematics", topic: "HCF", content: "What is the difference between HCF and GCD?", answer: "HCF and GCD are the same concept — different names.", status: "ANSWERED", aiDraft: null, createdAt: "2026-03-21T14:00:00" },
];

export const TEACHER_STATS = {
  quizzesThisWeek: 8,
  studentsActive: 124,
  avgScoreWeek: 77,
  openDoubts: 3,
  assignmentsActive: 3,
  aiCreditsUsed: 12,
  aiCreditsLimit: 50,
};

export const WEEKLY_PERFORMANCE = [71, 74, 72, 77, 79, 76, 80];

export const TOPIC_HEATMAP = [
  { topic: "Fractions", score: 76, attempts: 156, grade: 8 },
  { topic: "Integers", score: 82, attempts: 130, grade: 7 },
  { topic: "HCF/LCM", score: 79, attempts: 118, grade: 7 },
  { topic: "Photosynthesis", score: 71, attempts: 142, grade: 7 },
  { topic: "Cell Division", score: 68, attempts: 98, grade: 8 },
  { topic: "Integration", score: 84, attempts: 68, grade: 12 },
  { topic: "Light", score: 74, attempts: 110, grade: 8 },
  { topic: "Chemical Reactions", score: 69, attempts: 88, grade: 8 },
];
