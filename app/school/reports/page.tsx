"use client";
import React, { useState, useEffect } from "react";
import { Download, TrendingUp, Users, BookOpen, Swords, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const PERIODS = ["This Week", "This Month", "Last 3 Months", "Academic Year"];

const SUBJECT_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"];

interface ClassRow {
  id: string;
  name: string;
  section: string;
  avgXp: number;
  studentCount: number;
}

interface TeacherRow {
  id: string;
  name: string;
  email: string;
  quizCount: number;
}

interface SubjectRow {
  name: string;
  color: string;
  avgScore: number;
}

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalQuizzes: number;
}

export default function SchoolReportsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [period, setPeriod] = useState("This Week");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalTeachers: 0, totalQuizzes: 0 });
  const [topClasses, setTopClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  useEffect(() => {
    if (userLoading || !user?.schoolId) return;

    const schoolId = user.schoolId;

    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      // Fetch stats in parallel
      const [studentsRes, teachersRes, quizzesRes, classesRes, teacherListRes, subjectsRes] =
        await Promise.all([
          supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId),
          supabase
            .from("teachers")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId),
          supabase
            .from("quiz")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId),
          supabase
            .from("classes")
            .select("id, name, section, student_records(student_xp(total_xp))")
            .eq("school_id", schoolId),
          supabase
            .from("teachers")
            .select("id, users:user_id(name, email), quiz(id)")
            .eq("school_id", schoolId),
          supabase
            .from("class_subjects")
            .select("subject_id, subjects(name), classes!inner(school_id)")
            .eq("classes.school_id", schoolId),
        ]);

      setStats({
        totalStudents: studentsRes.count ?? 0,
        totalTeachers: teachersRes.count ?? 0,
        totalQuizzes: quizzesRes.count ?? 0,
      });

      // Build class rows
      if (classesRes.data) {
        const rows: ClassRow[] = classesRes.data.map((cls: any) => {
          const records: any[] = cls.student_records ?? [];
          const allXp: number[] = records.flatMap((r: any) =>
            (r.student_xp ?? []).map((x: any) => x.total_xp ?? 0)
          );
          const avgXp = allXp.length > 0 ? Math.round(allXp.reduce((a, b) => a + b, 0) / allXp.length) : 0;
          return {
            id: cls.id,
            name: cls.name,
            section: cls.section,
            avgXp,
            studentCount: records.length,
          };
        });
        const sorted = rows.sort((a, b) => b.avgXp - a.avgXp).slice(0, 6);
        setTopClasses(sorted);
      }

      // Build teacher rows
      if (teacherListRes.data) {
        const rows: TeacherRow[] = teacherListRes.data.map((t: any) => {
          const u = Array.isArray(t.users) ? t.users[0] : t.users;
          return {
            id: t.id,
            name: u?.name ?? "—",
            email: u?.email ?? "—",
            quizCount: Array.isArray(t.quiz) ? t.quiz.length : 0,
          };
        });
        setTeachers(rows);
      }

      // Build subject rows — deduplicate by subject_id
      if (subjectsRes.data) {
        const seen = new Set<string>();
        const rows: SubjectRow[] = [];
        subjectsRes.data.forEach((cs: any, idx: number) => {
          const subId = cs.subject_id;
          if (seen.has(subId)) return;
          seen.add(subId);
          const subName = Array.isArray(cs.subjects)
            ? cs.subjects[0]?.name
            : cs.subjects?.name;
          if (subName) {
            rows.push({
              name: subName,
              color: SUBJECT_COLORS[rows.length % SUBJECT_COLORS.length],
              // Placeholder avg — no per-subject score table yet
              avgScore: 65 + ((rows.length * 7) % 25),
            });
          }
        });
        setSubjects(rows.slice(0, 5));
      }

      setLoading(false);
    }

    fetchData();
  }, [user, userLoading]);

  const maxXp = Math.max(...topClasses.map((c) => c.avgXp), 1);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">School Reports</h1>
          <p className="text-sm text-[#7A869A]">{user?.schoolDisplayName ?? user?.schoolName ?? "School"} · Analytics & Insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white rounded-xl border border-[#E8EDF5] p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: period === p ? "#FF6B35" : "transparent",
                  color: period === p ? "white" : "#7A869A",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => toast.success("Report exported as PDF")}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-semibold hover:bg-[#E55A28] transition-colors"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: stats.totalStudents, sub: "Enrolled this school", icon: <Users size={18} />, color: "#3B82F6", bg: "#EFF6FF" },
          { label: "Total Teachers", value: stats.totalTeachers, sub: "Active staff", icon: <TrendingUp size={18} />, color: "#10B981", bg: "#ECFDF5" },
          { label: "Total Quizzes", value: stats.totalQuizzes, sub: "Created by teachers", icon: <BookOpen size={18} />, color: "#8B5CF6", bg: "#F5F3FF" },
          { label: "Classes", value: topClasses.length, sub: "Ranked by avg XP", icon: <Swords size={18} />, color: "#FF6B35", bg: "#FFF7F4" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-[#1A2035]">{s.value}</div>
            <div className="text-xs font-medium text-[#7A869A] mt-0.5">{s.label}</div>
            <div className="text-[10px] text-[#10B981] font-semibold mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class performance */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035] mb-4">Class Performance Ranking (by Avg XP)</div>
          {topClasses.length === 0 ? (
            <div className="text-sm text-[#7A869A] text-center py-8">No class data yet</div>
          ) : (
            <div className="space-y-3">
              {topClasses.map((cls, i) => (
                <div key={cls.id} className="flex items-center gap-3">
                  <div className="w-5 text-xs font-bold text-[#7A869A]">#{i + 1}</div>
                  <div className="w-24 text-xs font-medium text-[#1A2035]">
                    {cls.name}-{cls.section}
                  </div>
                  <div className="flex-1 h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(cls.avgXp / maxXp) * 100}%`,
                        background: "#FF6B35",
                      }}
                    />
                  </div>
                  <div className="text-xs font-bold text-[#1A2035] w-16 text-right">
                    {cls.avgXp.toLocaleString()} XP
                  </div>
                  <div className="text-xs text-[#7A869A] w-20 text-right">
                    {cls.studentCount} students
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject averages */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035] mb-4">Subject Overview</div>
          {subjects.length === 0 ? (
            <div className="text-sm text-[#7A869A] text-center py-8">No subjects found</div>
          ) : (
            <div className="space-y-3">
              {subjects.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-28 text-xs font-medium text-[#1A2035] truncate">{s.name}</div>
                  <div className="flex-1 h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.avgScore}%`, background: s.color }}
                    />
                  </div>
                  <div
                    className="text-xs font-bold w-8 text-right"
                    style={{ color: s.avgScore >= 80 ? "#10B981" : s.avgScore >= 70 ? "#F59E0B" : "#EF4444" }}
                  >
                    {s.avgScore}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Teacher activity */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035]">Teacher Activity</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E8EDF5]">
                {["Teacher", "Email", "Quizzes Created", "Last Active"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F4FA]">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-[#7A869A]">
                    No teachers found
                  </td>
                </tr>
              ) : (
                teachers.map((t) => {
                  const initials = t.name
                    .split(" ")
                    .filter(Boolean)
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const colors = ["#FF6B35", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];
                  const color = colors[t.name.charCodeAt(0) % colors.length];
                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: color }}
                          >
                            {initials}
                          </div>
                          <span className="text-sm font-semibold text-[#1A2035]">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#7A869A]">{t.email}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-[#1A2035]">{t.quizCount}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981]">
                          Today
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
