export const CURRENT_STUDENT = {
  id: "std-001",
  name: "Priya Nair",
  email: "priya.nair@student.dps.edu",
  initials: "PN",
  color: "#EC4899",
  classId: "cls-005",
  className: "Grade 8-A",
  rollNo: "8A-01",
  schoolName: "Delhi Public School, Vijayawada",
  xp: 4820,
  level: 9,
  levelName: "Champion",
  xpToNext: 5200,
  streak: 21,
  avgScore: 91,
  attendance: 96,
  rank: 1,
  totalStudents: 486,
  gamesPlayed: 15,
  gamesWon: 12,
  badges: 7,
};

export const STUDENT_SUBJECTS = [
  { id: "sub-001", name: "Mathematics", color: "#3B82F6", icon: "∑", avgScore: 94, quizzes: 18, rank: 1, weakTopic: "Trigonometry", strongTopic: "Algebra", teacher: "Mrs. S. Kumari", coverage: 82 },
  { id: "sub-002", name: "Science", color: "#10B981", icon: "⚗", avgScore: 88, quizzes: 15, rank: 2, weakTopic: "Chemical Equations", strongTopic: "Photosynthesis", teacher: "Mr. R. Sharma", coverage: 75 },
  { id: "sub-003", name: "English", color: "#8B5CF6", icon: "A", avgScore: 92, quizzes: 12, rank: 1, weakTopic: "Grammar Tenses", strongTopic: "Comprehension", teacher: "Mrs. P. Mehta", coverage: 90 },
  { id: "sub-004", name: "Hindi", color: "#F59E0B", icon: "ह", avgScore: 85, quizzes: 10, rank: 3, weakTopic: "Sandhi Viched", strongTopic: "Essay Writing", teacher: "Mrs. P. Mehta", coverage: 70 },
  { id: "sub-005", name: "Social Studies", color: "#EC4899", icon: "⚔", avgScore: 90, quizzes: 9, rank: 1, weakTopic: "Medieval History", strongTopic: "Geography", teacher: "Mrs. S. Nair", coverage: 65 },
];

export const STUDENT_ASSIGNMENTS = [
  { id: "asgn-001", title: "Fractions Practice Set", subject: "Mathematics", subjectColor: "#3B82F6", mode: "HOMEWORK", status: "PENDING", dueDate: "2026-03-22T18:00:00", questions: 15, timeMinutes: 20, xpReward: 36, difficulty: "MEDIUM", isUrgent: true },
  { id: "asgn-002", title: "Integers Speed Blitz", subject: "Mathematics", subjectColor: "#3B82F6", mode: "GAME", status: "COMPLETED", dueDate: "2026-03-23T09:00:00", questions: 10, timeMinutes: 8, xpReward: 50, difficulty: "MEDIUM", score: 90, xpEarned: 50 },
  { id: "asgn-003", title: "Photosynthesis Quiz", subject: "Science", subjectColor: "#10B981", mode: "HOMEWORK", status: "COMPLETED", dueDate: "2026-03-25T09:00:00", questions: 10, timeMinutes: 15, xpReward: 24, difficulty: "EASY", score: 100, xpEarned: 24 },
  { id: "asgn-004", title: "Monthly Science Olympiad", subject: "Science", subjectColor: "#10B981", mode: "COMPETITION", status: "PENDING", dueDate: "2026-03-29T23:59:00", questions: 30, timeMinutes: 45, xpReward: 100, difficulty: "HARD", isUrgent: false },
  { id: "asgn-005", title: "Light and Shadows", subject: "Science", subjectColor: "#10B981", mode: "HOMEWORK", status: "OVERDUE", dueDate: "2026-03-20T18:00:00", questions: 10, timeMinutes: 15, xpReward: 24, difficulty: "EASY", isUrgent: true },
];

export const QUIZ_QUESTIONS_FULL = [
  {
    id: "q-001", topic: "Adding Fractions",
    text: "What is 3/4 + 1/6?",
    options: ["5/10", "11/12", "4/10", "7/12"], correct: 1,
    explanation: "3/4 + 1/6 = 9/12 + 2/12 = 11/12",
    aiExplanation: "Great question on adding fractions with unlike denominators!\n\nStep 1 — Find the LCM of 4 and 6.\nMultiples of 4: 4, 8, 12 … Multiples of 6: 6, 12 … LCM = 12.\n\nStep 2 — Convert both fractions to the same denominator:\n• 3/4 = 9/12  (multiply top & bottom by 3)\n• 1/6 = 2/12  (multiply top & bottom by 2)\n\nStep 3 — Add the numerators:\n9/12 + 2/12 = 11/12\n\nKey rule: Never add denominators — only numerators change once the denominators match. ✅",
  },
  {
    id: "q-002", topic: "Simplifying Fractions",
    text: "Simplify 24/36 to lowest terms:",
    options: ["2/3", "3/4", "4/6", "1/2"], correct: 0,
    explanation: "GCD(24,36)=12. Answer = 2/3",
    aiExplanation: "To simplify a fraction, divide both numerator and denominator by their Greatest Common Divisor (GCD).\n\nFinding GCD(24, 36):\n• Factors of 24: 1, 2, 3, 4, 6, 8, 12, 24\n• Factors of 36: 1, 2, 3, 4, 6, 9, 12, 18, 36\n• Largest common factor = 12\n\nSo: 24 ÷ 12 = 2  and  36 ÷ 12 = 3\nFinal answer: 2/3\n\nOption C (4/6) looks tempting but is NOT in lowest terms — you can still divide both by 2. Always check that GCD of your result = 1. ✅",
  },
  {
    id: "q-003", topic: "Comparing Fractions",
    text: "Which fraction is largest?",
    options: ["3/5", "5/8", "7/10", "2/3"], correct: 2,
    explanation: "Convert: 0.6, 0.625, 0.7, 0.667. Largest = 7/10",
    aiExplanation: "The fastest way to compare unlike fractions is to convert each to a decimal:\n\n• 3/5  = 0.600\n• 5/8  = 0.625\n• 7/10 = 0.700  ← largest\n• 2/3  ≈ 0.667\n\nAlternatively, use a common denominator of 120:\n• 3/5  = 72/120\n• 5/8  = 75/120\n• 7/10 = 84/120  ← largest\n• 2/3  = 80/120\n\nBoth methods confirm 7/10 is the biggest. Decimal conversion is usually quicker for MCQs. ✅",
  },
  {
    id: "q-004", topic: "Multiplying Mixed Numbers",
    text: "What is 2 1/3 × 3/7?",
    options: ["1", "6/7", "7/7", "5/7"], correct: 0,
    explanation: "2 1/3 = 7/3. 7/3 × 3/7 = 21/21 = 1",
    aiExplanation: "Multiplying a mixed number by a fraction — two key steps:\n\nStep 1 — Convert the mixed number to an improper fraction:\n2 1/3  →  (2 × 3 + 1) / 3  =  7/3\n\nStep 2 — Multiply and simplify:\n7/3 × 3/7  =  (7 × 3) / (3 × 7)  =  21/21  =  1\n\nNotice that 7 and 7 cancel (÷7), and 3 and 3 cancel (÷3) — so even before multiplying you can cross-cancel: (7̶/3̶) × (3̶/7̶) = 1/1 = 1. Cross-cancelling saves time in exams! ✅",
  },
  {
    id: "q-005", topic: "Decimals to Fractions",
    text: "Express 0.625 as a fraction:",
    options: ["5/8", "6/10", "3/4", "7/11"], correct: 0,
    explanation: "0.625 = 625/1000 = 5/8",
    aiExplanation: "Converting a terminating decimal to a fraction:\n\nStep 1 — Write the decimal over a power of 10 matching its decimal places:\n0.625 has 3 decimal places → 625/1000\n\nStep 2 — Simplify by finding GCD(625, 1000):\n625 = 5⁴  and  1000 = 8 × 125 = 2³ × 5³\nGCD = 5³ = 125\n625 ÷ 125 = 5  and  1000 ÷ 125 = 8\nAnswer = 5/8\n\nMemory trick: 0.5 = 1/2, 0.25 = 1/4, 0.125 = 1/8, 0.625 = 5/8 (that's 5 × 0.125). ✅",
  },
  {
    id: "q-006", topic: "Photosynthesis Basics",
    text: "Which process is the 'kitchen of the plant'?",
    options: ["Respiration", "Transpiration", "Photosynthesis", "Germination"], correct: 2,
    explanation: "Photosynthesis produces food for the plant.",
    aiExplanation: "Plants are autotrophs — they make their own food, unlike animals (heterotrophs).\n\nThe 'kitchen of the plant' refers to Photosynthesis:\n• Location: Chloroplasts (mainly in leaf cells)\n• Raw materials: Carbon dioxide (CO₂) + Water (H₂O)\n• Energy source: Sunlight absorbed by chlorophyll\n• Products: Glucose (C₆H₁₂O₆) + Oxygen (O₂)\n\nEquation: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂\n\nOther options:\n• Respiration = releasing energy from glucose (the opposite!)\n• Transpiration = water loss through leaves\n• Germination = seed sprouting ✅",
  },
  {
    id: "q-007", topic: "Photosynthesis Inputs",
    text: "Raw materials for photosynthesis are:",
    options: ["O2 and glucose", "CO2 and water", "N2 and CO2", "H2O and O2"], correct: 1,
    explanation: "CO2 + water → glucose + oxygen",
    aiExplanation: "Photosynthesis is a two-input, two-output process:\n\nINPUTS (raw materials):\n✓ Carbon dioxide (CO₂) — absorbed through stomata from air\n✓ Water (H₂O) — absorbed by roots, transported via xylem\n\nOUTPUTS (products):\n→ Glucose (C₆H₁₂O₆) — stored as starch\n→ Oxygen (O₂) — released as a byproduct\n\nWhy other options are wrong:\n• O₂ and glucose are PRODUCTS, not raw materials\n• N₂ (nitrogen) is not used in photosynthesis\n• H₂O is a raw material but O₂ is a product, not another input\n\nMemory hook: 'CO₂ + H₂O + Light → Sugar + O₂' — write it 5 times! ✅",
  },
  {
    id: "q-008", topic: "Cell Organelles",
    text: "Chlorophyll is found in the:",
    options: ["Nucleus", "Mitochondria", "Chloroplast", "Cell wall"], correct: 2,
    explanation: "Chloroplasts contain chlorophyll.",
    aiExplanation: "Chlorophyll is the green pigment that captures sunlight for photosynthesis.\n\nIt is located inside Chloroplasts — double-membrane organelles found in plant cells and algae.\n\nInside the chloroplast:\n• Thylakoids (stacked disc membranes) → contain chlorophyll → absorb light\n• Stroma (fluid surrounding thylakoids) → where CO₂ is fixed into sugar\n\nWhy other options are wrong:\n• Nucleus — stores DNA, controls cell activities\n• Mitochondria — site of cellular respiration (the opposite of photosynthesis!)\n• Cell wall — gives structural support, made of cellulose, no pigments\n\nMemory: 'Green Chlorophyll lives in Chloroplasts' — both start with 'Chloro'! ✅",
  },
  {
    id: "q-009", topic: "Photosynthesis Outputs",
    text: "Which gas is released during photosynthesis?",
    options: ["CO2", "N2", "O2", "H2"], correct: 2,
    explanation: "Oxygen is the byproduct of splitting water molecules.",
    aiExplanation: "During photosynthesis, water molecules (H₂O) are split using light energy in a process called photolysis:\n\nH₂O → 2H⁺ + ½O₂ (+ electrons)\n\nThe oxygen (O₂) produced is released into the atmosphere through stomata.\n\nThis is actually the source of almost all the oxygen in Earth's atmosphere — produced by plants and cyanobacteria over billions of years!\n\nWhy other options are wrong:\n• CO₂ is absorbed (an input), not released\n• N₂ (nitrogen) is not involved in photosynthesis\n• H₂ (hydrogen gas) is not released — hydrogen ions are used to make glucose\n\nFun fact: One mature tree produces enough O₂ for about 2 people to breathe for a year! ✅",
  },
  {
    id: "q-010", topic: "Leaf Structure",
    text: "Stomata are used for:",
    options: ["Absorbing water", "Gas exchange", "Nutrient transport", "Seed dispersal"], correct: 1,
    explanation: "Stomata are tiny pores that allow CO2 in and O2 out.",
    aiExplanation: "Stomata (singular: stoma) are microscopic pores found mainly on the lower surface of leaves.\n\nPrimary function: Gas Exchange\n• CO₂ enters through stomata for photosynthesis\n• O₂ exits through stomata as a photosynthesis byproduct\n• Water vapour also exits (this is transpiration)\n\nHow stomata open and close:\nGuard cells (kidney-shaped cells on either side) control the pore size:\n• In sunlight → guard cells absorb water → swell → pore opens\n• At night → guard cells lose water → shrink → pore closes\n\nWhy other options are wrong:\n• Water is absorbed by roots, not stomata\n• Nutrient transport = xylem and phloem\n• Seed dispersal = fruits, wind, animals ✅",
  },
  {
    id: "q-011", topic: "HCF and LCM",
    text: "What is the HCF of 36 and 48?",
    options: ["6", "12", "18", "24"], correct: 1,
    explanation: "HCF = 12",
    aiExplanation: "Finding HCF (Highest Common Factor) using prime factorisation:\n\nStep 1 — Prime factorise each number:\n• 36 = 2² × 3²\n• 48 = 2⁴ × 3\n\nStep 2 — Take the LOWEST power of each common prime factor:\n• Common primes: 2 and 3\n• Lowest power of 2: min(2, 4) = 2² = 4\n• Lowest power of 3: min(2, 1) = 3¹ = 3\n\nStep 3 — Multiply:\nHCF = 4 × 3 = 12\n\nVerification: 36 ÷ 12 = 3 ✓ and 48 ÷ 12 = 4 ✓\n\nRemember: HCF is always ≤ the smaller number, and it divides both numbers exactly. ✅",
  },
  {
    id: "q-012", topic: "HCF and LCM",
    text: "What is the LCM of 4, 6, and 8?",
    options: ["12", "24", "48", "36"], correct: 1,
    explanation: "LCM = 24",
    aiExplanation: "Finding LCM (Least Common Multiple) of 4, 6, and 8 using prime factorisation:\n\nStep 1 — Prime factorise each:\n• 4 = 2²\n• 6 = 2 × 3\n• 8 = 2³\n\nStep 2 — Take the HIGHEST power of each prime that appears:\n• Highest power of 2: 2³ = 8\n• Highest power of 3: 3¹ = 3\n\nStep 3 — Multiply:\nLCM = 8 × 3 = 24\n\nVerification: 24 ÷ 4 = 6 ✓, 24 ÷ 6 = 4 ✓, 24 ÷ 8 = 3 ✓\n\nKey insight: LCM ≥ the largest number. Option C (48) would also be a common multiple but NOT the least. LCM is always the smallest such number. ✅",
  },
];

export const WEAK_TOPICS = [
  { subject: "Mathematics", topic: "Trigonometry", score: 54, attempts: 3, recommendation: "Review NCERT Chapter 8 — Introduction to Trigonometry" },
  { subject: "Science", topic: "Chemical Equations", score: 61, attempts: 4, recommendation: "Practice balancing equations with our worksheet set" },
  { subject: "Hindi", topic: "Sandhi Viched", score: 58, attempts: 2, recommendation: "Watch our Sandhi explainer video (12 min)" },
  { subject: "Social Studies", topic: "Medieval History", score: 63, attempts: 3, recommendation: "Try the Medieval India Timeline quiz" },
];

export const ALL_BADGES = [
  { id: "bdg-001", name: "First Quiz", icon: "🎯", description: "Complete your first quiz", earned: true, earnedAt: "2025-09-01", rarity: "COMMON", xp: 10 },
  { id: "bdg-002", name: "Perfect 100", icon: "💯", description: "Score 100% on any quiz", earned: true, earnedAt: "2025-09-15", rarity: "RARE", xp: 50 },
  { id: "bdg-003", name: "Week Warrior", icon: "🔥", description: "7-day streak", earned: true, earnedAt: "2025-10-01", rarity: "UNCOMMON", xp: 30 },
  { id: "bdg-004", name: "Speed Demon", icon: "⚡", description: "Finish Speed Blitz in top 3", earned: true, earnedAt: "2025-10-20", rarity: "RARE", xp: 50 },
  { id: "bdg-005", name: "Tug Champion", icon: "🏆", description: "Win 5 Tug of War games", earned: true, earnedAt: "2025-11-01", rarity: "EPIC", xp: 100 },
  { id: "bdg-006", name: "Scholar", icon: "📚", description: "Complete 50 quizzes", earned: true, earnedAt: "2025-12-01", rarity: "RARE", xp: 75 },
  { id: "bdg-007", name: "AI Beater", icon: "🤖", description: "Beat the AI on Hard mode", earned: true, earnedAt: "2026-01-10", rarity: "EPIC", xp: 100 },
  { id: "bdg-008", name: "Subject Master", icon: "🌟", description: "Score 90%+ in all 5 subjects", earned: false, earnedAt: null, rarity: "LEGENDARY", xp: 200 },
  { id: "bdg-009", name: "Streak Legend", icon: "🦁", description: "30-day streak", earned: false, earnedAt: null, rarity: "LEGENDARY", xp: 250 },
];

export const GAME_HISTORY = [
  { id: "gh-001", game: "Tug of War", opponent: "Rahul Mehta", opponentInitials: "RM", opponentColor: "#3B82F6", subject: "Mathematics", topic: "Fractions", result: "WIN", myScore: 8, oppScore: 6, xpEarned: 40, playedAt: "Today 9:15 AM" },
  { id: "gh-002", game: "Speed Blitz", opponent: "Class Battle", opponentInitials: "CB", opponentColor: "#8B5CF6", subject: "Science", topic: "Photosynthesis", result: "WIN", myScore: 92, oppScore: 78, xpEarned: 60, rank: 1, playedAt: "Today 8:00 AM" },
  { id: "gh-003", game: "VS AI", opponent: "EduBot (Hard)", opponentInitials: "AI", opponentColor: "#0EA5E9", subject: "Mathematics", topic: "Integers", result: "WIN", myScore: 9, oppScore: 7, xpEarned: 80, playedAt: "Yesterday 4:30 PM" },
  { id: "gh-004", game: "Tug of War", opponent: "Arjun Sharma", opponentInitials: "AS", opponentColor: "#FF6B35", subject: "Science", topic: "Cell Division", result: "LOSS", myScore: 5, oppScore: 8, xpEarned: 10, playedAt: "Yesterday 3:00 PM" },
];

export const XP_HISTORY = [
  { date: "Mon", xp: 180 },
  { date: "Tue", xp: 240 },
  { date: "Wed", xp: 120 },
  { date: "Thu", xp: 310 },
  { date: "Fri", xp: 280 },
  { date: "Sat", xp: 420 },
  { date: "Sun", xp: 190 },
];

export const DAILY_CHALLENGE = {
  subject: "Mathematics",
  topic: "Fractions",
  questions: 5,
  timeMinutes: 5,
  xpReward: 50,
  completed: false,
  expiresAt: "2026-03-22T23:59:00",
};

export const ONLINE_CLASSMATES = [
  { id: "std-002", name: "Rahul Mehta", initials: "RM", color: "#3B82F6", status: "playing", activity: "Speed Blitz" },
  { id: "std-003", name: "Arjun Sharma", initials: "AS", color: "#FF6B35", status: "studying", activity: "Science quiz" },
  { id: "std-005", name: "Dev Kumar", initials: "DK", color: "#8B5CF6", status: "online", activity: "Dashboard" },
  { id: "std-009", name: "Meena Iyer", initials: "MI", color: "#0EA5E9", status: "playing", activity: "Tug of War" },
];

export const EXTRACURRICULAR_CHALLENGES = [
  { id: "ec-001", title: "Science Olympiad 2026", category: "Competition", status: "ACTIVE", deadline: "2026-04-15", xpReward: 500, badge: "🏅", mySubmission: null, description: "Inter-school science competition. Submit a 2-page solution to the given problem." },
  { id: "ec-002", title: "Math Creative Problem Set", category: "Creative", status: "SUBMITTED", deadline: "2026-03-20", xpReward: 200, badge: "✨", mySubmission: { submittedAt: "2026-03-19", status: "UNDER_REVIEW", aiScore: 84 }, description: "Solve 5 open-ended math problems using real-world applications." },
  { id: "ec-003", title: "Essay: Technology in Education", category: "Writing", status: "ACTIVE", deadline: "2026-04-01", xpReward: 150, badge: "📝", mySubmission: null, description: "Write a 500-word essay on how technology is changing education in India." },
  { id: "ec-004", title: "Environmental Science Model", category: "Project", status: "COMPLETED", deadline: "2026-02-28", xpReward: 300, badge: "🌿", mySubmission: { submittedAt: "2026-02-25", status: "GRADED", aiScore: 91, teacherScore: 88 }, description: "Build a working model demonstrating an environmental science concept." },
];

export const STUDENT_DOUBTS = [
  { id: "dbt-s-001", subject: "Mathematics", topic: "Trigonometry", question: "What is the difference between sin and cos?", status: "ANSWERED", answer: "sin = opposite/hypotenuse, cos = adjacent/hypotenuse. Remember SOH-CAH-TOA!", askedAt: "2026-03-20T10:00:00", answeredAt: "2026-03-20T14:30:00", teacherName: "Mrs. S. Kumari" },
  { id: "dbt-s-002", subject: "Science", topic: "Chemical Equations", question: "How do I balance chemical equations?", status: "OPEN", answer: null, askedAt: "2026-03-22T09:00:00", answeredAt: null, teacherName: "Mr. R. Sharma" },
];

export const CLASS_LEADERBOARD = [
  { rank: 1, name: "Priya Nair", initials: "PN", color: "#EC4899", xp: 4820, score: 91, streak: 21, change: 0, isMe: true },
  { rank: 2, name: "Rahul Mehta", initials: "RM", color: "#3B82F6", xp: 4210, score: 87, streak: 18, change: 1, isMe: false },
  { rank: 3, name: "Arjun Sharma", initials: "AS", color: "#FF6B35", xp: 3240, score: 80, streak: 14, change: 2, isMe: false },
  { rank: 4, name: "Dev Kumar", initials: "DK", color: "#8B5CF6", xp: 3100, score: 74, streak: 9, change: 0, isMe: false },
  { rank: 5, name: "Meena Iyer", initials: "MI", color: "#0EA5E9", xp: 3140, score: 76, streak: 6, change: -1, isMe: false },
  { rank: 6, name: "Kavya Singh", initials: "KS", color: "#F59E0B", xp: 2890, score: 71, streak: 4, change: 1, isMe: false },
  { rank: 7, name: "Rohan Gupta", initials: "RG", color: "#10B981", xp: 2750, score: 69, streak: 7, change: -2, isMe: false },
  { rank: 8, name: "Ananya Rao", initials: "AR", color: "#6366F1", xp: 2640, score: 67, streak: 3, change: 0, isMe: false },
];

export const STUDENT_RESOURCES = [
  // ── My School resources ──────────────────────────────────────────────────
  { id: "res-s01", title: "NCERT Mathematics Class 8 — Chapter 1: Rational Numbers", subject: "Mathematics", type: "PDF", duration: null, pages: 22, size: "2.4 MB", source: "SCHOOL", level: "INTERMEDIATE", tags: ["rational numbers", "fractions", "class8"], uploadedBy: "Mrs. S. Kumari", uploadedAt: "2025-11-01", views: 342, saved: true, color: "#3B82F6" },
  { id: "res-s02", title: "Sandhi Viched Practice Worksheet", subject: "Hindi", type: "PDF", duration: null, pages: 8, size: "0.8 MB", source: "SCHOOL", level: "INTERMEDIATE", tags: ["sandhi", "hindi", "class8"], uploadedBy: "Mrs. P. Mehta", uploadedAt: "2026-02-20", views: 87, saved: false, color: "#F59E0B" },
  { id: "res-s03", title: "English Grammar — Tenses Quick Reference", subject: "English", type: "PDF", duration: null, pages: 5, size: "0.6 MB", source: "SCHOOL", level: "STARTER", tags: ["grammar", "tenses", "english"], uploadedBy: "Mrs. P. Mehta", uploadedAt: "2026-03-01", views: 124, saved: true, color: "#8B5CF6" },
  { id: "res-s04", title: "Chemical Equations — Practice Problems", subject: "Science", type: "PDF", duration: null, pages: 12, size: "1.2 MB", source: "SCHOOL", level: "INTERMEDIATE", tags: ["chemistry", "equations", "class8"], uploadedBy: "Mr. R. Sharma", uploadedAt: "2026-03-18", views: 67, saved: false, color: "#10B981" },
  { id: "res-s05", title: "Medieval India — Teacher Notes & Summary", subject: "Social Studies", type: "PDF", duration: null, pages: 9, size: "1.0 MB", source: "SCHOOL", level: "INTERMEDIATE", tags: ["medieval history", "class8", "sst"], uploadedBy: "Mrs. S. Nair", uploadedAt: "2026-04-01", views: 52, saved: false, color: "#EC4899" },
  { id: "res-s06", title: "Photosynthesis Video Lecture (Class)", subject: "Science", type: "VIDEO", duration: "14:32", pages: null, size: "128 MB", source: "SCHOOL", level: "STARTER", tags: ["photosynthesis", "class7", "nutrition"], uploadedBy: "Mr. R. Sharma", uploadedAt: "2026-01-15", views: 218, saved: true, color: "#10B981" },
  // ── EduBattle prebuilt resources ─────────────────────────────────────────
  { id: "res-e01", title: "Algebra Master Series — 5-Part Video Course", subject: "Mathematics", type: "VIDEO", duration: "1:12:40", pages: null, size: null, source: "EDUBATTLE", level: "ADVANCED", tags: ["algebra", "variables", "expressions", "equations"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-01-01", views: 12480, saved: false, color: "#3B82F6" },
  { id: "res-e02", title: "Trigonometry Basics — Step-by-Step Animated", subject: "Mathematics", type: "VIDEO", duration: "22:15", pages: null, size: null, source: "EDUBATTLE", level: "ADVANCED", tags: ["trigonometry", "sin", "cos", "class10"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-02-01", views: 8932, saved: false, color: "#3B82F6" },
  { id: "res-e03", title: "Fractions Flashcard Set — 40 Cards", subject: "Mathematics", type: "FLASHCARD", duration: null, pages: null, size: null, source: "EDUBATTLE", level: "STARTER", tags: ["fractions", "class8", "mental math"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-02-10", views: 6456, saved: false, color: "#3B82F6" },
  { id: "res-e04", title: "Statistics & Probability Complete Guide", subject: "Mathematics", type: "PDF", duration: null, pages: 34, size: "3.8 MB", source: "EDUBATTLE", level: "PRO", tags: ["statistics", "probability", "class11", "data"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-03-01", views: 4210, saved: false, color: "#3B82F6" },
  { id: "res-e05", title: "Integration & Differentiation — Concept Map", subject: "Mathematics", type: "FLASHCARD", duration: null, pages: null, size: null, source: "EDUBATTLE", level: "PRO", tags: ["calculus", "integration", "class12"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-03-15", views: 3120, saved: true, color: "#3B82F6" },
  { id: "res-e06", title: "Cell Biology Complete Course — 8 Chapters", subject: "Science", type: "VIDEO", duration: "2:04:10", pages: null, size: null, source: "EDUBATTLE", level: "ADVANCED", tags: ["cell biology", "mitosis", "class9"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-01-20", views: 9870, saved: false, color: "#10B981" },
  { id: "res-e07", title: "Periodic Table — Visual Cheat Sheet", subject: "Science", type: "IMAGE", duration: null, pages: 1, size: null, source: "EDUBATTLE", level: "STARTER", tags: ["periodic table", "elements", "chemistry"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-02-05", views: 15230, saved: true, color: "#10B981" },
  { id: "res-e08", title: "French Revolution — Illustrated Mind Map", subject: "Social Studies", type: "IMAGE", duration: null, pages: 1, size: null, source: "EDUBATTLE", level: "INTERMEDIATE", tags: ["history", "french revolution", "class9"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-03-05", views: 7193, saved: true, color: "#EC4899" },
  { id: "res-e09", title: "Indian Constitution — Full Explainer PDF", subject: "Social Studies", type: "PDF", duration: null, pages: 28, size: "2.2 MB", source: "EDUBATTLE", level: "INTERMEDIATE", tags: ["civics", "constitution", "class10"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-02-25", views: 5440, saved: false, color: "#EC4899" },
  { id: "res-e10", title: "Creative Writing Masterclass — Video Series", subject: "English", type: "VIDEO", duration: "48:30", pages: null, size: null, source: "EDUBATTLE", level: "ADVANCED", tags: ["creative writing", "essays", "english"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-03-10", views: 4380, saved: false, color: "#8B5CF6" },
  { id: "res-e11", title: "Grammar Deep Dive — All Tenses & Voices", subject: "English", type: "PDF", duration: null, pages: 18, size: "1.4 MB", source: "EDUBATTLE", level: "INTERMEDIATE", tags: ["grammar", "tenses", "voice", "english"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-02-18", views: 6810, saved: false, color: "#8B5CF6" },
  { id: "res-e12", title: "Hindi Vyakaran — Complete Flashcard Deck", subject: "Hindi", type: "FLASHCARD", duration: null, pages: null, size: null, source: "EDUBATTLE", level: "INTERMEDIATE", tags: ["hindi", "grammar", "vyakaran"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-02-28", views: 3920, saved: false, color: "#F59E0B" },
  { id: "res-e13", title: "Olympiad Math — Advanced Problem Set", subject: "Mathematics", type: "PDF", duration: null, pages: 52, size: "4.2 MB", source: "EDUBATTLE", level: "PRO", tags: ["olympiad", "competition", "advanced math"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-03-20", views: 2190, saved: false, color: "#3B82F6" },
  { id: "res-e14", title: "NEET Science Foundation — Biology Module", subject: "Science", type: "PDF", duration: null, pages: 68, size: "5.6 MB", source: "EDUBATTLE", level: "PRO", tags: ["neet", "biology", "class11", "entrance"], uploadedBy: "EduBattle Experts", uploadedAt: "2026-04-01", views: 1840, saved: false, color: "#10B981" },
];

export const STUDENT_NOTIFICATIONS = [
  { id: "notif-001", type: "BADGE", icon: "🏆", title: "New badge unlocked!", body: "You earned the 'AI Beater' badge for defeating EduBot on Hard mode.", time: "2h ago", read: false, link: "/student/badges" },
  { id: "notif-002", type: "ASSIGNMENT", icon: "📋", title: "Assignment due tomorrow", body: "Fractions Practice Set is due on 22 March at 6:00 PM. Don't miss it!", time: "4h ago", read: false, link: "/student/assignments" },
  { id: "notif-003", type: "DOUBT", icon: "✅", title: "Doubt answered", body: "Mrs. S. Kumari answered your question on Trigonometry.", time: "Yesterday", read: true, link: "/student/doubts" },
  { id: "notif-004", type: "GAME", icon: "⚔️", title: "Rahul challenged you!", body: "Rahul Mehta wants to challenge you to Tug of War in Mathematics.", time: "Yesterday", read: true, link: "/student/play/tug-of-war" },
  { id: "notif-005", type: "STREAK", icon: "🔥", title: "21-day streak milestone!", body: "Amazing! You've maintained a 21-day learning streak. Keep it up!", time: "3 days ago", read: true, link: "/student/dashboard" },
  { id: "notif-006", type: "RANK", icon: "🥇", title: "You're #1 in class!", body: "You've climbed to rank #1 in Grade 8-A with 4820 XP. Incredible!", time: "4 days ago", read: true, link: "/student/leaderboard" },
];

export const ATTENDANCE_CALENDAR = {
  month: "March 2026",
  days: [
    { date: 1, status: "present" }, { date: 2, status: "present" }, { date: 3, status: "absent" },
    { date: 4, status: "present" }, { date: 5, status: "present" }, { date: 6, status: "present" },
    { date: 7, status: "present" }, { date: 8, status: "holiday" }, { date: 9, status: "holiday" },
    { date: 10, status: "present" }, { date: 11, status: "present" }, { date: 12, status: "present" },
    { date: 13, status: "present" }, { date: 14, status: "present" }, { date: 15, status: "holiday" },
    { date: 16, status: "holiday" }, { date: 17, status: "present" }, { date: 18, status: "present" },
    { date: 19, status: "late" }, { date: 20, status: "present" }, { date: 21, status: "present" },
    { date: 22, status: "present" }, { date: 23, status: "future" }, { date: 24, status: "future" },
    { date: 25, status: "future" }, { date: 26, status: "future" }, { date: 27, status: "future" },
    { date: 28, status: "future" }, { date: 29, status: "future" }, { date: 30, status: "future" },
    { date: 31, status: "future" },
  ],
  summary: { present: 18, absent: 1, late: 1, holiday: 4, percentage: 94.7 },
};
