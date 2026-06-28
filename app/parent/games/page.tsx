"use client";
import React, { useEffect, useState } from "react";
import { Swords, Trophy, Clock, Star } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

async function fetchChild(parentUserId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select(`id, user_id, school_id,
      user:user_id ( id, name, email ),
      student_records ( id, class_id, is_current, classes:class_id ( name, section ) ),
      student_xp ( total_xp )`)
    .eq("parent_user_id", parentUserId)
    .maybeSingle();
  return data;
}

interface Attempt {
  score: number;
  xp_earned: number;
  created_at: string;
  time_taken: number | null;
  assignment: { title: string } | null;
}

export default function ParentGamesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [childName, setChildName] = useState<string>("");
  const [totalXp, setTotalXp] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading || !user) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const child = await fetchChild(user.id);
      if (!child) { setLoading(false); return; }

      const name = (child.user as { name?: string } | null)?.name ?? "Your child";
      setChildName(name);

      const xpArr = Array.isArray(child.student_xp) ? child.student_xp as { total_xp: number }[] : [];
      setTotalXp(xpArr[0]?.total_xp ?? 0);

      const records: { id: string; is_current: boolean }[] = Array.isArray(child.student_records)
        ? child.student_records as { id: string; is_current: boolean }[]
        : [];
      const currentRecord = records.find((r) => r.is_current);
      const childRecordId = currentRecord?.id ?? null;

      if (childRecordId) {
        const { data } = await supabase
          .from("assignment_attempts")
          .select("score, xp_earned, created_at, time_taken, assignment:assignment_id(title)")
          .eq("student_records_id", childRecordId)
          .order("created_at", { ascending: false })
          .limit(20);
        setAttempts((data as unknown as Attempt[]) ?? []);
      }

      setLoading(false);
    })();
  }, [user, userLoading]);

  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts)
    : 0;
  const totalXpFromQuizzes = attempts.reduce((sum, a) => sum + a.xp_earned, 0);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Game Activity</h1>
        <p className="text-sm text-[#7A869A]">{childName}&apos;s quiz battles and performance</p>
      </div>

      {/* Parent note */}
      <div className="bg-[#F5F3FF] rounded-2xl p-5 border border-[#DDD6FE]">
        <div className="text-xs font-bold text-[#8B5CF6] mb-1">💡 Why games matter</div>
        <div className="text-sm text-[#1A2035]">
          EduBattle games are curriculum-aligned and improve retention by up to 40% vs traditional studying.
          All questions are from NCERT syllabus. Playing games = active learning!
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Quizzes",     value: totalAttempts,           icon: <Swords size={16} />, color: "#8B5CF6", bg: "#F5F3FF" },
          { label: "Avg Score",         value: `${avgScore}%`,          icon: <Trophy size={16} />, color: "#10B981", bg: "#ECFDF5" },
          { label: "XP from Quizzes",   value: `+${totalXpFromQuizzes}`,icon: <Star size={16} />,   color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Total XP",          value: `+${totalXp}`,           icon: <Star size={16} />,   color: "#FF6B35", bg: "#FFF7F4" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Game history */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035]">Quiz Battle History</div>
        </div>
        {attempts.length === 0 ? (
          <div className="text-center py-12 text-[#7A869A] text-sm">
            <Swords size={36} className="text-[#E8EDF5] mx-auto mb-3" />
            No quiz battles yet.
          </div>
        ) : (
          <div className="divide-y divide-[#F0F4FA]">
            {attempts.map((attempt, i) => {
              const scoreColor = attempt.score >= 80 ? "#10B981" : attempt.score >= 60 ? "#F59E0B" : "#EF4444";
              const scoreBg    = attempt.score >= 80 ? "#ECFDF5" : attempt.score >= 60 ? "#FFFBEB" : "#FEF2F2";
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-[#F5F3FF]">
                    ⚔️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1A2035] truncate">
                      {attempt.assignment?.title ?? "Quiz Battle"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#7A869A]">
                      <Clock size={10} />
                      <span>{new Date(attempt.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {attempt.time_taken && <><span>·</span><span>{formatTime(attempt.time_taken)}</span></>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold px-2.5 py-1 rounded-xl" style={{ background: scoreBg, color: scoreColor }}>
                      {attempt.score}%
                    </div>
                    <div className="text-xs font-semibold text-[#FF6B35] mt-1">+{attempt.xp_earned} XP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
