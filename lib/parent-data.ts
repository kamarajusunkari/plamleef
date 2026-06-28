import { STUDENT_SUBJECTS, STUDENT_ASSIGNMENTS, GAME_HISTORY, XP_HISTORY, ATTENDANCE_CALENDAR } from "./student-data";

export const CURRENT_PARENT = {
  id: "par-001",
  name: "Mr. Suresh Nair",
  email: "suresh.nair@gmail.com",
  phone: "9876501234",
  initials: "SN",
  color: "#0A1628",
  relation: "Father",
};

export const CHILD = {
  id: "std-001",
  name: "Priya Nair",
  initials: "PN",
  color: "#EC4899",
  classId: "cls-005",
  className: "Grade 8-A",
  rollNo: "8A-01",
  schoolName: "Delhi Public School, Vijayawada",
  xp: 4820,
  level: 9,
  levelName: "Champion",
  nextLevelXp: 5200,
  xpToNext: 5200,
  streak: 21,
  avgScore: 91,
  attendance: 96,
  rank: 1,
  totalStudents: 486,
  gamesPlayed: 15,
  gamesWon: 12,
  gamesThisWeek: 4,
  xpThisWeek: 340,
  badges: 7,
};

export const CHILD_SUBJECTS = STUDENT_SUBJECTS;
export const CHILD_ASSIGNMENTS = STUDENT_ASSIGNMENTS;
export const CHILD_GAME_HISTORY = GAME_HISTORY;
export const CHILD_XP_HISTORY = XP_HISTORY;
export const CHILD_ATTENDANCE = ATTENDANCE_CALENDAR;

export const CHILD_WEAK_TOPICS = [
  { subject: "Mathematics", topic: "Trigonometry", score: 54, recommendation: "Review NCERT Chapter 8", resourceLink: "#" },
  { subject: "Hindi", topic: "Sandhi Viched", score: 58, recommendation: "Watch Sandhi explainer video (12 min)", resourceLink: "#" },
];

export const CHILD_BADGES = [
  { id: "bdg-001", name: "First Quiz", icon: "🎯", rarity: "COMMON", bg: "#F0F4FA" },
  { id: "bdg-002", name: "Perfect 100", icon: "💯", rarity: "RARE", bg: "#EFF6FF" },
  { id: "bdg-003", name: "Week Warrior", icon: "🔥", rarity: "UNCOMMON", bg: "#FFFBEB" },
  { id: "bdg-005", name: "Tug Champion", icon: "🏆", rarity: "EPIC", bg: "#FFF7F4" },
  { id: "bdg-006", name: "Scholar", icon: "📚", rarity: "RARE", bg: "#EFF6FF" },
  { id: "bdg-007", name: "AI Beater", icon: "🤖", rarity: "EPIC", bg: "#F5F3FF" },
  { id: "bdg-004", name: "Speed Demon", icon: "⚡", rarity: "RARE", bg: "#FFFBEB" },
];

export const AI_WEEKLY_REPORT = {
  period: "March 17–22, 2026",
  weekOf: "March 17–22, 2026",
  overallScore: 91,
  overallTrend: "+3%",
  highlights: [
    { type: "achievement", title: "School Topper 🏆", detail: "Led the school leaderboard for the 3rd week in a row", icon: "🏆" },
    { type: "improvement", title: "Science Improved 📈", detail: "Score improved from 85% to 88% this week", icon: "📈" },
    { type: "streak", title: "21-Day Streak 🔥", detail: "Exceptional dedication — maintaining a 21-day learning streak", icon: "🔥" },
    { type: "game", title: "Game Master ⚔️", detail: "Won 3 out of 4 games, including VS AI on Hard mode", icon: "⚔️" },
  ],
  weakAreas: ["Trigonometry (54%)", "Sandhi Viched (58%)"],
  parentTip: "Priya is performing exceptionally well! Encourage her to tackle the Science Olympiad challenge before April 15. This will help her college portfolio.",
  generatedAt: "2026-03-22T08:00:00",
};

export const PARENT_MESSAGE_THREAD = {
  id: "msg-p-001",
  teacherName: "Mrs. S. Kumari",
  teacherInitials: "SK",
  teacherColor: "#FF6B35",
  subject: "Mathematics",
  messages: [
    { id: "m-1", sender: "teacher", text: "Priya is absolutely exceptional. I am assigning her advanced enrichment content. No need to worry!", time: "Tue 4:00 PM" },
    { id: "m-2", sender: "parent", text: "She got 95 today! Thank you so much", time: "Today 11:00 AM" },
  ],
  unread: 0,
};

export const ALL_TEACHER_THREADS = [
  {
    id: "t-001",
    teacherName: "Mrs. S. Kumari",
    teacherInitials: "SK",
    teacherColor: "#FF6B35",
    subject: "Mathematics",
    lastMessage: "She got 95 today! Thank you so much",
    lastTime: "Today",
    unread: 0,
    messages: [
      { id: "m-1", sender: "teacher", text: "Priya is absolutely exceptional. I am assigning her advanced enrichment content. No need to worry!", time: "Tue 4:00 PM" },
      { id: "m-2", sender: "parent", text: "She got 95 today! Thank you so much", time: "Today 11:00 AM" },
    ],
  },
  {
    id: "t-002",
    teacherName: "Mr. R. Sharma",
    teacherInitials: "RS",
    teacherColor: "#3B82F6",
    subject: "Science",
    lastMessage: "Priya should focus on chemical equations this week",
    lastTime: "Yesterday",
    unread: 1,
    messages: [
      { id: "m-1", sender: "teacher", text: "Hello Mr. Nair, just wanted to share that Priya scored 88% in Science this week.", time: "Mon 3:00 PM" },
      { id: "m-2", sender: "parent", text: "That's great! Any areas she should focus on?", time: "Mon 4:00 PM" },
      { id: "m-3", sender: "teacher", text: "Priya should focus on chemical equations this week", time: "Yesterday 2:00 PM" },
    ],
  },
];

export const UPCOMING_EVENTS = [
  {
    id: "ev-001",
    title: "Parent-Teacher Meeting",
    date: "2026-04-05",
    day: "5",
    month: "APR",
    time: "9:00 AM – 1:00 PM",
    type: "MEETING",
    detail: "Individual discussions with all teachers",
    description: "Individual discussions with all subject teachers",
    location: "School Main Hall",
    color: "#10B981",
  },
  {
    id: "ev-002",
    title: "Annual Day Celebrations",
    date: "2026-04-15",
    day: "15",
    month: "APR",
    time: "8:30 AM onwards",
    type: "EVENT",
    detail: "Cultural performances & prize distribution",
    description: "Cultural performances and prize distribution",
    location: "School Auditorium",
    color: "#8B5CF6",
  },
  {
    id: "ev-003",
    title: "Unit Test — Mathematics",
    date: "2026-03-25",
    day: "25",
    month: "MAR",
    time: "8:00 AM",
    type: "EXAM",
    detail: "Chapters 1–4, NCERT Grade 8",
    description: "Chapters 1-4 of NCERT Grade 8 Mathematics",
    location: "Classroom",
    color: "#FF6B35",
  },
];

export const SCHOOL_CONTEXT = {
  schoolName: "Delhi Public School, Vijayawada",
  principalName: "Mrs. Kavitha Reddy",
  phone: "0866-2437890",
  email: "info@dpsvijayawada.edu",
  address: "Gunadala, Vijayawada, Andhra Pradesh 520004",
};
