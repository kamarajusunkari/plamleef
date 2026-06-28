"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const SUBJECT_COLORS = ["#FF6B35", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16"];
const SUBJECT_ICONS = ["📐", "🔬", "📖", "🌍", "🎨", "💻", "🧪", "📝"];

interface SubjectWithStats {
  id: string;
  name: string;
  teacherName: string;
  avgScore: number | null;
  attemptCount: number;
  color: string;
  icon: string;
}

export default function StudentSubjectsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);
  const [selected, setSelected] = useState<SubjectWithStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.classId || !user?.studentRecordId) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch class subjects with teacher info
      const { data: classSubjects, error: csError } = await supabase
        .from("class_subjects")
        .select("id, subject:subject_id(id, name), teacher:teacher_id(id, users:user_id(name))")
        .eq("class_id", user.classId);

      if (csError || !classSubjects) { setLoading(false); return; }

      // Fetch assignment attempts with subject linkage
      const { data: attempts } = await supabase
        .from("assignment_attempts")
        .select("score, assignment:assignment_id(quiz:quiz_id(subject_id))")
        .eq("student_records_id", user.studentRecordId);

      // Group scores by subject_id
      const scoresBySubject: Record<string, number[]> = {};
      if (attempts) {
        for (const attempt of attempts) {
          const subjectId = (attempt.assignment as any)?.quiz?.subject_id;
          if (subjectId && attempt.score != null) {
            if (!scoresBySubject[subjectId]) scoresBySubject[subjectId] = [];
            scoresBySubject[subjectId].push(attempt.score);
          }
        }
      }

      const enriched: SubjectWithStats[] = classSubjects.map((cs: any, idx: number) => {
        const subjectId = cs.subject?.id;
        const scores = scoresBySubject[subjectId] ?? [];
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : null;
        const teacherUser = cs.teacher?.users;
        const teacherName = Array.isArray(teacherUser)
          ? teacherUser[0]?.name ?? "—"
          : teacherUser?.name ?? "—";

        return {
          id: subjectId ?? cs.id,
          name: cs.subject?.name ?? "Unknown",
          teacherName,
          avgScore,
          attemptCount: scores.length,
          color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
          icon: SUBJECT_ICONS[idx % SUBJECT_ICONS.length],
        };
      });

      setSubjects(enriched);
      if (enriched.length > 0) setSelected(enriched[0]);
      setLoading(false);
    };

    fetchData();
  }, [user?.classId, user?.studentRecordId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">My Subjects</h1>
          <p className="text-sm text-[#7A869A]">Loading subjects...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">My Subjects</h1>
          <p className="text-sm text-[#7A869A]">No subjects assigned yet</p>
        </div>
        <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] text-center">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-sm text-[#7A869A]">No subjects found for your class</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">My Subjects</h1>
        <p className="text-sm text-[#7A869A]">Performance overview across {subjects.length} subjects</p>
      </div>

      {/* Subject cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {subjects.map(sub => (
          <div
            key={sub.id}
            onClick={() => setSelected(sub)}
            className="bg-white rounded-2xl p-4 border-2 cursor-pointer transition-all hover:shadow-card text-center"
            style={{ borderColor: selected?.id === sub.id ? sub.color : "#E8EDF5" }}
          >
            <div className="text-3xl mb-2">{sub.icon}</div>
            <div className="text-xs font-bold text-[#1A2035] mb-1">{sub.name}</div>
            {sub.avgScore != null ? (
              <>
                <div className="text-xl font-bold mb-1" style={{ color: sub.color }}>{sub.avgScore}%</div>
                <div className="h-1.5 bg-[#F0F4FA] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${sub.avgScore}%`, background: sub.color }} />
                </div>
              </>
            ) : (
              <div className="text-xs text-[#CBD5E1] mt-1">No data</div>
            )}
          </div>
        ))}
      </div>

      {/* Selected subject detail */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E8EDF5]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: selected.color + "20" }}>
                {selected.icon}
              </div>
              <div>
                <div className="text-lg font-bold text-[#1A2035]">{selected.name}</div>
                <div className="text-sm text-[#7A869A]">{selected.teacherName} · {selected.attemptCount} quiz{selected.attemptCount !== 1 ? "zes" : ""} completed</div>
              </div>
              <div className="ml-auto text-right">
                {selected.avgScore != null ? (
                  <>
                    <div className="text-3xl font-bold" style={{ color: selected.color }}>{selected.avgScore}%</div>
                    <div className="text-xs text-[#7A869A]">Average score</div>
                  </>
                ) : (
                  <div className="text-sm text-[#CBD5E1]">No attempts yet</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { label: "Quizzes Done", value: selected.attemptCount, color: "#1A2035" },
                { label: "Avg Score", value: selected.avgScore != null ? `${selected.avgScore}%` : "—", color: selected.color },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-[#F8FAFC] rounded-xl">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[11px] text-[#7A869A]">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href={`/student/quiz?title=${encodeURIComponent(selected.name + " Practice")}&subject=${encodeURIComponent(selected.name)}&questions=5&time=30&xp=50`}
                className="flex-1 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55A28] transition-colors text-center"
              >
                Practice Now
              </Link>
              <Link
                href="/student/resources"
                className="flex-1 py-2.5 border border-[#E8EDF5] text-[#7A869A] rounded-xl text-sm font-medium hover:bg-[#F0F4FA] transition-colors text-center"
              >
                View Resources
              </Link>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={14} className="text-[#F59E0B]" />
              <span className="text-sm font-semibold text-[#1A2035]">Focus Areas</span>
            </div>
            {subjects.filter(s => s.avgScore != null && s.avgScore < 70).length === 0 ? (
              <div className="text-xs text-[#7A869A] text-center py-6">
                {subjects.some(s => s.avgScore != null)
                  ? "Great job! No weak areas detected."
                  : "Complete some assignments to see focus areas."}
              </div>
            ) : (
              <div className="space-y-3">
                {subjects
                  .filter(s => s.avgScore != null && s.avgScore < 70)
                  .map(s => (
                    <div key={s.id} className="p-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A]">
                      <div className="text-xs font-bold text-[#1A2035] mb-0.5">{s.name}</div>
                      <div className="text-[10px] text-[#7A869A] mb-2">{s.attemptCount} attempts</div>
                      <div className="h-1.5 bg-[#FEF3C7] rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${s.avgScore}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F59E0B]">{s.avgScore}%</span>
                        <Link
                          href={`/student/quiz?title=${encodeURIComponent(s.name + " Practice")}&subject=${encodeURIComponent(s.name)}&questions=5&time=30&xp=30`}
                          className="text-[10px] text-[#FF6B35] font-semibold hover:underline"
                        >
                          Practice →
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
