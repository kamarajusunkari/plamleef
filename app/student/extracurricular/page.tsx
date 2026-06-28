"use client";
import React, { useState, useEffect } from "react";
import { Clock, Star, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const DIFFICULTY_STYLE: Record<string, { bg: string; color: string }> = {
  easy: { bg: "#ECFDF5", color: "#10B981" },
  medium: { bg: "#FFFBEB", color: "#F59E0B" },
  hard: { bg: "#FEF2F2", color: "#EF4444" },
};

const SUBJECT_COLORS = ["#FF6B35", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16"];

interface Quiz {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  count: number;
  created_at: string;
  subjects: { name: string } | { name: string }[] | null;
  attempted: boolean;
}

export default function StudentExtracurricularPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.classId || !user?.studentRecordId) return;

    const fetchQuizzes = async () => {
      setLoading(true);

      // Fetch quizzes for this class
      const { data: quizData, error } = await supabase
        .from("quiz")
        .select("id, title, topic, difficulty, count, created_at, subjects:subject_id(name)")
        .eq("class_id", user.classId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !quizData) { setLoading(false); return; }

      // Fetch assignment_attempts for this student to check which quizzes were attempted
      // We do this via assignments linked to the quizzes
      const quizIds = quizData.map((q: any) => q.id);

      const { data: assignments } = await supabase
        .from("assignment")
        .select("id, quiz_id")
        .in("quiz_id", quizIds);

      const assignmentIds = (assignments ?? []).map((a: any) => a.id);
      const assignmentToQuiz: Record<string, string> = {};
      for (const a of assignments ?? []) {
        assignmentToQuiz[a.id] = a.quiz_id;
      }

      let attemptedQuizIds = new Set<string>();
      if (assignmentIds.length > 0) {
        const { data: attempts } = await supabase
          .from("assignment_attempts")
          .select("assignment_id")
          .eq("student_records_id", user.studentRecordId)
          .in("assignment_id", assignmentIds);

        for (const att of attempts ?? []) {
          const qid = assignmentToQuiz[att.assignment_id];
          if (qid) attemptedQuizIds.add(qid);
        }
      }

      const enriched: Quiz[] = quizData.map((q: any) => ({
        ...q,
        attempted: attemptedQuizIds.has(q.id),
      }));

      setQuizzes(enriched);
      setLoading(false);
    };

    fetchQuizzes();
  }, [user?.classId, user?.studentRecordId]);

  const getSubjectName = (subjects: Quiz["subjects"]): string => {
    if (!subjects) return "General";
    if (Array.isArray(subjects)) return subjects[0]?.name ?? "General";
    return subjects.name ?? "General";
  };

  const getDifficultyStyle = (difficulty: string) => {
    const key = (difficulty ?? "").toLowerCase();
    return DIFFICULTY_STYLE[key] ?? { bg: "#F8FAFC", color: "#64748B" };
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Extracurricular Challenges</h1>
        <p className="text-sm text-[#7A869A]">Explore quizzes and earn extra XP through challenges</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Available",
            value: loading ? "…" : quizzes.length,
            color: "#3B82F6",
            bg: "#EFF6FF",
          },
          {
            label: "Attempted",
            value: loading ? "…" : quizzes.filter(q => q.attempted).length,
            color: "#10B981",
            bg: "#ECFDF5",
          },
          {
            label: "Remaining",
            value: loading ? "…" : quizzes.filter(q => !q.attempted).length,
            color: "#F59E0B",
            bg: "#FFFBEB",
          },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5] text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quiz challenge list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] text-center">
          <BookOpen size={40} className="text-[#CBD5E1] mx-auto mb-3" />
          <div className="text-sm text-[#7A869A]">No challenges available yet</div>
          <div className="text-xs text-[#CBD5E1] mt-1">Check back later for new quizzes from your teachers</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quizzes.map((quiz, idx) => {
            const diffStyle = getDifficultyStyle(quiz.difficulty);
            const subjectName = getSubjectName(quiz.subjects);
            const accentColor = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];

            return (
              <div key={quiz.id} className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden hover:shadow-card transition-all">
                {/* Color bar */}
                <div className="h-1.5" style={{ background: accentColor }} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: accentColor + "20" }}>
                      🎯
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1A2035] leading-tight">{quiz.title}</div>
                      <div className="text-xs text-[#7A869A] mt-0.5">{subjectName}</div>
                    </div>
                    {quiz.attempted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] shrink-0">Done</span>
                    )}
                  </div>

                  {quiz.topic && (
                    <div className="text-xs text-[#7A869A] mb-3 italic">Topic: {quiz.topic}</div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                      style={diffStyle}
                    >
                      {quiz.difficulty ?? "Mixed"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#7A869A]">
                      <BookOpen size={10} /> {quiz.count} questions
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#7A869A] ml-auto">
                      <Clock size={10} /> {new Date(quiz.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => toast("Quiz mode coming soon!")}
                    className="w-full py-2 rounded-xl text-sm font-bold transition-colors text-center"
                    style={{
                      background: quiz.attempted ? "#F0F4FA" : "#FF6B35",
                      color: quiz.attempted ? "#7A869A" : "white",
                    }}
                  >
                    {quiz.attempted ? "Attempted" : "Attempt Challenge"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* XP incentive */}
      <div className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] rounded-2xl p-5 text-white">
        <div className="text-sm font-bold mb-1">💡 Why do challenges?</div>
        <div className="text-xs opacity-80">
          Extracurricular challenges contribute to your <strong>holistic score</strong> which appears on your school report card.
          They also help you practice topics and earn extra XP to climb the leaderboard!
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
          <span className="bg-white/20 px-2 py-1 rounded-full">Extra XP per challenge</span>
          <span className="bg-white/20 px-2 py-1 rounded-full">Practice topics</span>
          <span className="bg-white/20 px-2 py-1 rounded-full">Climb leaderboard</span>
        </div>
      </div>
    </div>
  );
}
