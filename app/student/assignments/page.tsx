"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, CheckCircle, AlertCircle, Zap, Trophy, BookOpen, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

type Status = "ALL" | "PENDING" | "COMPLETED" | "OVERDUE";

interface Assignment {
  id: string;
  quizId: string;
  title: string;
  subject: string;
  subjectColor: string;
  mode: string;
  status: Status;
  dueDate: string;
  questions: number;
  timeMinutes: number;
  xpReward: number;
  difficulty: string;
  isUrgent: boolean;
  score?: number;
  xpEarned?: number;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6",
  Science: "#10B981",
  English: "#8B5CF6",
  Hindi: "#F59E0B",
  "Social Studies": "#EC4899",
};

function deriveStatus(dueDate: string, isAttempted: boolean): Exclude<Status, "ALL"> {
  if (isAttempted) return "COMPLETED";
  if (new Date(dueDate) < new Date()) return "OVERDUE";
  return "PENDING";
}

const MODE_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  HOMEWORK: { icon: <BookOpen size={16} />, label: "Homework", color: "#8B5CF6", bg: "#F5F3FF" },
  GAME:     { icon: <Zap size={16} />,     label: "Game Mode", color: "#FF6B35", bg: "#FFF7F4" },
  COMPETITION: { icon: <Trophy size={16} />, label: "Competition", color: "#FFB347", bg: "#FFFBEB" },
};

function quizUrl(a: Assignment) {
  return `/student/quiz?id=${a.id}&quizId=${a.quizId}&title=${encodeURIComponent(a.title)}&subject=${encodeURIComponent(a.subject)}&questions=${a.questions}&time=30&xp=${a.xpReward}`;
}

export default function StudentAssignmentsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [filter, setFilter] = useState<Status>("ALL");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.studentRecordId || !user?.classId) return;
    let cancelled = false;

    async function fetchAssignments() {
      if (!user?.studentRecordId || !user?.classId) return;
      setLoading(true);
      try {
        const supabase = createClient();

        const { data: rawAssignments, error: aError } = await supabase
          .from("assignment")
          .select(`
            id,
            title,
            mode,
            duedate,
            quiz:quiz_id (
              id,
              count,
              time,
              difficulty,
              subject:subject_id ( name )
            )
          `)
          .eq("class_id", user.classId)
          .eq("status", "ACTIVE")
          .order("duedate", { ascending: true });

        if (aError || !rawAssignments) throw aError;

        const assignmentIds = rawAssignments.map((a) => a.id as string);
        let attemptMap = new Map<string, { score: number; xp_earned: number }>();

        if (assignmentIds.length > 0) {
          const { data: attempts } = await supabase
            .from("assignment_attempts")
            .select("assignment_id, score, xp_earned")
            .eq("student_records_id", user.studentRecordId)
            .in("assignment_id", assignmentIds);
          (attempts ?? []).forEach((att) => {
            attemptMap.set(att.assignment_id, { score: att.score, xp_earned: att.xp_earned });
          });
        }

        if (cancelled) return;

        const mapped: Assignment[] = rawAssignments.map((a) => {
          const quiz = (a.quiz as unknown) as { id: string; count: number; time: number; difficulty: string; subject: { name: string } | null } | null;
          const subjectName = quiz?.subject?.name ?? "General";
          const attempt = attemptMap.get(a.id as string);
          const isAttempted = !!attempt;
          const dueDate = (a.duedate as string) ?? new Date().toISOString();
          const status = deriveStatus(dueDate, isAttempted);
          const questionCount = quiz?.count ?? 10;
          const xpReward = Math.round(questionCount * 3);

          return {
            id:           a.id as string,
            quizId:       quiz?.id ?? "",
            title:        (a.title as string) || "Assignment",
            subject:      subjectName,
            subjectColor: SUBJECT_COLORS[subjectName] ?? "#7A869A",
            mode:         (a.mode as string) ?? "HOMEWORK",
            status,
            dueDate,
            questions:    questionCount,
            timeMinutes:  Math.max(Math.ceil(((quiz?.time ?? 30) * questionCount) / 60), 5),
            xpReward,
            difficulty:   quiz?.difficulty ?? "MEDIUM",
            isUrgent:     status === "OVERDUE",
            ...(attempt ? { score: attempt.score, xpEarned: attempt.xp_earned } : {}),
          };
        });

        setAssignments(mapped);
      } catch (err) {
        console.warn("Assignments fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAssignments();
    return () => { cancelled = true; };
  }, [user?.studentRecordId, user?.classId]);

  const filtered = assignments.filter((a) => filter === "ALL" || a.status === filter);

  const isPageLoading = userLoading || loading;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">My Assignments</h1>
        {isPageLoading ? (
          <p className="text-sm text-[#7A869A]">Loading...</p>
        ) : (
          <p className="text-sm text-[#7A869A]">
            {assignments.filter((a) => a.status === "PENDING").length} pending ·&nbsp;
            {assignments.filter((a) => a.status === "OVERDUE").length} overdue ·&nbsp;
            {assignments.filter((a) => a.status === "COMPLETED").length} completed
          </p>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "OVERDUE", "COMPLETED"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: filter === s ? "#FF6B35" : "#F0F4FA", color: filter === s ? "white" : "#7A869A" }}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}{" "}
            ({isPageLoading ? "…" : assignments.filter((a) => s === "ALL" || a.status === s).length})
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isPageLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-[#E8EDF5] h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isPageLoading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl p-10 border border-[#E8EDF5] text-center">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-sm font-semibold text-[#1A2035] mb-1">No assignments yet</div>
          <div className="text-xs text-[#7A869A]">
            {filter === "ALL" ? "Your teacher hasn't posted any assignments yet." : `No ${filter.toLowerCase()} assignments.`}
          </div>
        </div>
      )}

      {/* Assignment cards */}
      {!isPageLoading && (
        <div className="space-y-3">
          {filtered.map((a) => {
            const mode = MODE_META[a.mode] ?? MODE_META["HOMEWORK"];
            const isOverdue = a.status === "OVERDUE";
            return (
              <div key={a.id} className="bg-white rounded-2xl p-5 border border-[#E8EDF5] flex items-center gap-5 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: mode.bg, color: mode.color }}>
                  {mode.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[#1A2035]">{a.title}</span>
                    {isOverdue && <AlertCircle size={14} className="text-[#EF4444]" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#7A869A]">
                    <span className="font-medium" style={{ color: a.subjectColor }}>{a.subject}</span>
                    <span>·</span>
                    <span>{a.questions} questions</span>
                    <span>·</span>
                    <span className={isOverdue ? "text-[#EF4444] font-semibold" : ""}>
                      <Clock size={10} className="inline mr-0.5" />
                      {a.dueDate.split("T")[0]}
                    </span>
                  </div>
                </div>

                <div className="hidden md:block shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.difficulty === "EASY" ? "bg-[#DCFCE7] text-[#166534]" : a.difficulty === "MEDIUM" ? "bg-[#FEF9C3] text-[#854D0E]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                    {a.difficulty}
                  </span>
                </div>

                <div className="hidden md:block text-center shrink-0">
                  <div className="text-sm font-bold text-[#FF6B35]">+{a.xpReward} XP</div>
                  <div className="text-[10px] text-[#7A869A]">reward</div>
                </div>

                <div className="shrink-0">
                  {a.status === "COMPLETED" ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-[#10B981]" />
                      <div>
                        <div className="text-sm font-bold text-[#10B981]">{a.score}%</div>
                        <div className="text-[10px] text-[#7A869A]">+{a.xpEarned} XP</div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={quizUrl(a)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ background: isOverdue ? "#EF4444" : "#FF6B35" }}
                    >
                      <Play size={14} />
                      {isOverdue ? "Submit Now" : "Start"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
