"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Download, TrendingUp, Users, BookOpen, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

type ClassStat = {
  classId: string;
  className: string;
  assignmentCount: number;
  totalAttempts: number;
  avgScore: number;
  totalXp: number;
};

type AssignmentRow = {
  id: string;
  title: string;
  class: { name: string; section: string } | null;
};

type AttemptRow = {
  score: number;
  xp_earned: number;
  assignment_id: string;
};

export default function TeacherReportsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [overallAvgScore, setOverallAvgScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  useEffect(() => {
    if (!user?.teacherId) return;
    fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.teacherId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch assignments
      const { data: assignments, error: aErr } = await supabase
        .from("assignment")
        .select("id, title, class:class_id(name, section)")
        .eq("teacher_id", user!.teacherId);

      if (aErr) throw aErr;
      const assignmentList = (assignments as unknown as AssignmentRow[]) || [];
      const assignmentIds = assignmentList.map(a => a.id);
      setTotalAssignments(assignmentList.length);

      if (assignmentIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch attempts
      const { data: attempts, error: atErr } = await supabase
        .from("assignment_attempts")
        .select("score, xp_earned, assignment_id")
        .in("assignment_id", assignmentIds);

      if (atErr) throw atErr;
      const attemptList = (attempts as unknown as AttemptRow[]) || [];
      setTotalAttempts(attemptList.length);

      // Group by class
      const classMap: Record<string, { name: string; section: string; assignmentIds: Set<string>; scores: number[]; xp: number[] }> = {};

      for (const assignment of assignmentList) {
        const cls = assignment.class;
        if (!cls) continue;
        const key = `${cls.name}-${cls.section}`;
        if (!classMap[key]) {
          classMap[key] = { name: cls.name, section: cls.section, assignmentIds: new Set(), scores: [], xp: [] };
        }
        classMap[key].assignmentIds.add(assignment.id);
      }

      for (const attempt of attemptList) {
        for (const key of Object.keys(classMap)) {
          if (classMap[key].assignmentIds.has(attempt.assignment_id)) {
            classMap[key].scores.push(attempt.score);
            classMap[key].xp.push(attempt.xp_earned);
          }
        }
      }

      const stats: ClassStat[] = Object.entries(classMap).map(([key, val]) => ({
        classId: key,
        className: `${val.name} ${val.section}`,
        assignmentCount: val.assignmentIds.size,
        totalAttempts: val.scores.length,
        avgScore: val.scores.length > 0 ? Math.round(val.scores.reduce((s, v) => s + v, 0) / val.scores.length) : 0,
        totalXp: val.xp.reduce((s, v) => s + v, 0),
      }));

      setClassStats(stats);

      if (attemptList.length > 0) {
        const avg = Math.round(attemptList.reduce((s, a) => s + a.score, 0) / attemptList.length);
        setOverallAvgScore(avg);
      }

      // Count unique students who attempted
      const { count } = await supabase
        .from("assignment_attempts")
        .select("student_records_id", { count: "exact", head: true })
        .in("assignment_id", assignmentIds);
      setTotalStudents(count || 0);

    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const maxScore = classStats.length > 0 ? Math.max(...classStats.map(c => c.avgScore), 1) : 100;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Reports</h1>
          <p className="text-sm text-[#7A869A]">Performance analytics for your classes</p>
        </div>
        <button onClick={() => toast("Downloading PDF report...")} className="flex items-center gap-2 bg-[#8B5CF6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors">
          <Download size={16} /> Export PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Students Attempted", value: totalStudents, icon: <Users size={18} />, color: "#3B82F6", bg: "#EFF6FF" },
              { label: "Avg Score", value: `${overallAvgScore}%`, icon: <TrendingUp size={18} />, color: "#10B981", bg: "#ECFDF5" },
              { label: "Assignments Given", value: totalAssignments, icon: <BookOpen size={18} />, color: "#8B5CF6", bg: "#F5F3FF" },
              { label: "Total Attempts", value: totalAttempts, icon: <span className="text-sm">📝</span>, color: "#FF6B35", bg: "#FFF7F4" },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: card.bg, color: card.color }}>
                  {card.icon}
                </div>
                <div className="text-2xl font-bold text-[#1A2035]">{card.value}</div>
                <div className="text-xs text-[#7A869A] mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>

          {classStats.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] flex flex-col items-center justify-center text-center">
              <BookOpen size={40} className="text-[#E8EDF5] mb-3" />
              <p className="text-sm font-semibold text-[#1A2035]">No data yet</p>
              <p className="text-xs text-[#7A869A] mt-1">Create assignments and students will appear here once they attempt them</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Class performance table */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
                <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Class Performance</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#F0F4FA]">
                        <th className="text-left font-bold text-[#7A869A] pb-2 pr-3">Class</th>
                        <th className="text-right font-bold text-[#7A869A] pb-2 px-2">Assignments</th>
                        <th className="text-right font-bold text-[#7A869A] pb-2 px-2">Attempts</th>
                        <th className="text-right font-bold text-[#7A869A] pb-2">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F8FAFC]">
                      {classStats.map(cls => (
                        <tr key={cls.classId}>
                          <td className="py-2.5 pr-3 font-semibold text-[#1A2035]">{cls.className}</td>
                          <td className="py-2.5 px-2 text-right text-[#7A869A]">{cls.assignmentCount}</td>
                          <td className="py-2.5 px-2 text-right text-[#7A869A]">{cls.totalAttempts}</td>
                          <td className="py-2.5 text-right font-bold" style={{ color: cls.avgScore >= 70 ? "#10B981" : cls.avgScore >= 50 ? "#F59E0B" : "#EF4444" }}>
                            {cls.avgScore}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bar chart for avg scores */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
                <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Avg Score by Class</h2>
                <div className="space-y-3">
                  {classStats.map(cls => (
                    <div key={cls.classId}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-[#1A2035] truncate max-w-[60%]">{cls.className}</span>
                        <span className="font-bold ml-2" style={{ color: cls.avgScore >= 70 ? "#10B981" : cls.avgScore >= 50 ? "#F59E0B" : "#EF4444" }}>
                          {cls.avgScore}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(cls.avgScore / maxScore) * 100}%`,
                            background: cls.avgScore >= 70 ? "#10B981" : cls.avgScore >= 50 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
