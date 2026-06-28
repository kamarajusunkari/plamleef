"use client";
import React, { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
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

interface SubjectCard {
  id: string;
  name: string;
  teacherName: string;
  avgScore: number | null;
  attemptCount: number;
}

export default function ParentSubjectsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [childName, setChildName] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectCard[]>([]);
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

      const records: { id: string; class_id: string; is_current: boolean }[] = Array.isArray(child.student_records)
        ? child.student_records as { id: string; class_id: string; is_current: boolean }[]
        : [];
      const currentRecord = records.find((r) => r.is_current);
      const childClassId = currentRecord?.class_id ?? null;
      const childRecordId = currentRecord?.id ?? null;

      if (!childClassId) { setLoading(false); return; }

      // Fetch class subjects
      const { data: classSubjectsData } = await supabase
        .from("class_subjects")
        .select("subject:subject_id(id, name), teacher:teacher_id(user:user_id(name))")
        .eq("class_id", childClassId);

      const classSubjects = (classSubjectsData ?? []) as unknown as {
        subject: { id: string; name: string } | null;
        teacher: { user: { name: string } | null } | null;
      }[];

      // Fetch assignment attempts for score averages
      let attempts: { score: number; assignment: { quiz: { subject_id: string } | null } | null }[] = [];
      if (childRecordId) {
        const { data: attemptsData } = await supabase
          .from("assignment_attempts")
          .select("score, assignment:assignment_id(quiz:quiz_id(subject_id))")
          .eq("student_records_id", childRecordId);
        attempts = (attemptsData ?? []) as unknown as typeof attempts;
      }

      // Group scores by subject_id
      const scoreMap = new Map<string, number[]>();
      for (const a of attempts) {
        const subjectId = a.assignment?.quiz?.subject_id;
        if (subjectId) {
          if (!scoreMap.has(subjectId)) scoreMap.set(subjectId, []);
          scoreMap.get(subjectId)!.push(a.score);
        }
      }

      const cards: SubjectCard[] = classSubjects.map((cs) => {
        const subjectId = cs.subject?.id ?? "";
        const subjectName = cs.subject?.name ?? "Unknown";
        const teacherName = cs.teacher?.user?.name ?? "—";
        const scores = scoreMap.get(subjectId) ?? [];
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;
        return { id: subjectId, name: subjectName, teacherName, avgScore, attemptCount: scores.length };
      });

      setSubjects(cards);
      setLoading(false);
    })();
  }, [user, userLoading]);

  const SUBJECT_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#FF6B35", "#06B6D4"];

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Subjects</h1>
        <p className="text-sm text-[#7A869A]">Academic performance overview for {childName}</p>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] text-center">
          <BookOpen size={40} className="text-[#E8EDF5] mx-auto mb-3" />
          <div className="text-sm text-[#7A869A]">No subjects found for your child&apos;s class.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s, idx) => {
            const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
            const scoreColor = s.avgScore === null ? "#7A869A" : s.avgScore >= 80 ? "#10B981" : s.avgScore >= 60 ? "#F59E0B" : "#EF4444";
            const scoreBg   = s.avgScore === null ? "#F0F4FA" : s.avgScore >= 80 ? "#ECFDF5" : s.avgScore >= 60 ? "#FFFBEB" : "#FEF2F2";
            return (
              <div key={s.id} className="bg-white rounded-2xl p-5 border border-[#E8EDF5] hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                    style={{ background: color }}
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#1A2035] truncate">{s.name}</div>
                    <div className="text-xs text-[#7A869A]">Teacher: {s.teacherName}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#7A869A]">
                    {s.attemptCount > 0 ? `${s.attemptCount} quiz${s.attemptCount === 1 ? "" : "zes"}` : "No quizzes yet"}
                  </div>
                  <div
                    className="text-sm font-bold px-3 py-1 rounded-xl"
                    style={{ background: scoreBg, color: scoreColor }}
                  >
                    {s.avgScore !== null ? `${s.avgScore}% avg` : "No data yet"}
                  </div>
                </div>

                {s.avgScore !== null && (
                  <div className="mt-3 h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.avgScore}%`, background: scoreColor }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
