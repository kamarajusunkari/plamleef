"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Breadcrumb } from "@/components/school/Breadcrumb";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Avatar } from "@/components/school/Avatar";
import { ProgressBar } from "@/components/school/ProgressBar";
import { getScoreBadgeClass } from "@/lib/utils";

const TABS = ["Overview", "Assignments", "Attendance", "XP History", "Badges"];

const XP_THRESHOLDS = [0, 250, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6500, 8000, 10000];
const LEVEL_NAMES = ["Rookie", "Explorer", "Scholar", "Achiever", "Champion", "Elite", "Master", "Legend", "Grandmaster", "Expert", "Prodigy", "Genius"];

function calcLevel(xp: number): { level: number; name: string } {
  let level = 1;
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return { level, name: LEVEL_NAMES[level - 1] ?? "Genius" };
}

function nextLevelXp(xp: number): number {
  for (const threshold of XP_THRESHOLDS) {
    if (xp < threshold) return threshold;
  }
  return XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
}

function nameToColor(name: string): string {
  const colors = ["#FF6B35", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function calcInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const MOCK_BADGES = [
  { name: "Perfect 100", emoji: "💯", desc: "Score 100% in any quiz", earned: true, date: "Mar 20", color: "#FFB347" },
  { name: "Speed Demon", emoji: "⚡", desc: "Complete quiz in under 5 min", earned: true, date: "Mar 15", color: "#3B82F6" },
  { name: "Streak Master", emoji: "🔥", desc: "10-day streak", earned: true, date: "Mar 10", color: "#FF6B35" },
  { name: "Game Champion", emoji: "🏆", desc: "Win 10 games", earned: false, progress: 6, target: 10, color: "#8B5CF6" },
  { name: "Quiz Warrior", emoji: "⚔", desc: "Complete 50 quizzes", earned: false, progress: 32, target: 50, color: "#10B981" },
  { name: "Scholar", emoji: "🎓", desc: "Reach Scholar level", earned: true, date: "Feb 28", color: "#EC4899" },
];

interface StudentData {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  className: string;
  classId: string | null;
  xp: number;
  level: number;
  levelName: string;
  initials: string;
  color: string;
  avgScore: number;
}

interface AttemptRow {
  id: string;
  score: number;
  submitted_at: string | null;
  title: string;
  subject: string;
  mode: string;
}

interface XpLogRow {
  id: string;
  source: string;
  description: string | null;
  xp_earned: number;
  created_at: string;
}

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [student, setStudent] = useState<StudentData | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [xpLogs, setXpLogs] = useState<XpLogRow[]>([]);

  useEffect(() => {
    if (!studentId) return;

    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      // Fetch student
      const { data: studentRec } = await supabase
        .from("students")
        .select("id, school_id, users:user_id(id, name, email, photo)")
        .eq("id", studentId)
        .single();

      if (!studentRec) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const u = Array.isArray(studentRec.users) ? studentRec.users[0] : studentRec.users as any;
      const name: string = u?.name ?? "Unknown";
      const email: string = u?.email ?? "";
      const photo: string | null = u?.photo ?? null;

      // Fetch current record
      const { data: record } = await supabase
        .from("student_records")
        .select("id, class_id, classes(name, section)")
        .eq("student_id", studentId)
        .eq("is_current", true)
        .maybeSingle();

      const cls = record
        ? (Array.isArray(record.classes) ? record.classes[0] : record.classes as any)
        : null;
      const className = cls ? `${cls.name}-${cls.section}` : "—";
      const classId = record?.class_id ?? null;

      // Fetch XP
      let totalXp = 0;
      if (record?.id) {
        const { data: xpRow } = await supabase
          .from("student_xp")
          .select("total_xp")
          .eq("student_records_id", record.id)
          .maybeSingle();
        totalXp = xpRow?.total_xp ?? 0;
      }

      const { level, name: levelName } = calcLevel(totalXp);

      // Fetch XP logs
      let logs: XpLogRow[] = [];
      if (record?.id) {
        const { data: xpLogsData } = await supabase
          .from("xp_logs")
          .select("id, source, description, xp_earned, created_at")
          .eq("student_records_id", record.id)
          .order("created_at", { ascending: false })
          .limit(10);
        logs = xpLogsData ?? [];
      }

      // Fetch assignment attempts
      let attemptRows: AttemptRow[] = [];
      if (record?.id) {
        const { data: attemptsData } = await supabase
          .from("assignment_attempts")
          .select("id, score, submitted_at, assignments:assignment_id(title, mode, quiz:quiz_id(subject:subject_id(name)))")
          .eq("student_records_id", record.id)
          .order("submitted_at", { ascending: false })
          .limit(10);

        attemptRows = (attemptsData ?? []).map((a: any) => {
          const assignment = Array.isArray(a.assignments) ? a.assignments[0] : a.assignments;
          const quiz = assignment
            ? (Array.isArray(assignment.quiz) ? assignment.quiz[0] : assignment.quiz)
            : null;
          const subject = quiz
            ? (Array.isArray(quiz.subject) ? quiz.subject[0]?.name : quiz.subject?.name) ?? "—"
            : "—";
          return {
            id: a.id,
            score: a.score ?? 0,
            submitted_at: a.submitted_at,
            title: assignment?.title ?? "Untitled",
            subject,
            mode: assignment?.mode ?? "HOMEWORK",
          };
        });
      }

      const avgScore =
        attemptRows.length > 0
          ? Math.round(attemptRows.reduce((s, a) => s + a.score, 0) / attemptRows.length)
          : 0;

      setStudent({
        id: studentRec.id,
        name,
        email,
        photo,
        className,
        classId,
        xp: totalXp,
        level,
        levelName,
        initials: calcInitials(name),
        color: nameToColor(name),
        avgScore,
      });
      setAttempts(attemptRows);
      setXpLogs(logs);
      setLoading(false);
    }

    fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
      </div>
    );
  }

  if (notFound || !student) {
    return <div className="p-8 text-center text-[#7A869A]">Student not found</div>;
  }

  const xpNext = nextLevelXp(student.xp);
  const xpPrev = XP_THRESHOLDS[student.level - 1] ?? 0;
  const xpPct = xpNext > xpPrev ? ((student.xp - xpPrev) / (xpNext - xpPrev)) * 100 : 100;
  const xpToNext = xpNext - student.xp;

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="animate-fadeIn">
      <Breadcrumb items={[{ label: "Students", href: "/school/students" }, { label: student.name }]} />

      <Card className="mb-6">
        <div className="flex items-start gap-5">
          <Avatar initials={student.initials} color={student.color} size={72} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[#1A2035]">{student.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">
                {student.className}
              </span>
            </div>
            <div className="text-sm text-[#7A869A] mb-3">{student.email}</div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#FFB347]">
                  Lv.{student.level} {student.levelName}
                </span>
                <span className="text-[10px] text-[#7A869A]">
                  {xpToNext > 0 ? `${xpToNext} XP to next level` : "Max level"}
                </span>
              </div>
              <div className="h-3 bg-[#F0F4FA] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${Math.min(xpPct, 100)}%`,
                    background: "linear-gradient(90deg, #FF6B35, #FFB347)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[#7A869A]">{student.xp.toLocaleString()} XP</span>
                <span className="text-[10px] text-[#7A869A]">{xpNext.toLocaleString()} XP</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#3B82F6] bg-[#EFF6FF] px-2 py-1 rounded-lg font-medium">
                🎯 {student.avgScore}% Avg Score
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="primary" onClick={() => toast.success(`Notification sent to ${student.name}`)}>
              Send Notification
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toast("Contacting parent...")}>
              Contact Parent
            </Button>
            {student.classId && (
              <Button size="sm" variant="ghost" onClick={() => router.push(`/school/timetable?class=${student.classId}`)}>
                View Timetable
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="flex gap-1 mb-6">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === i ? "bg-[#FF6B35] text-white" : "text-[#7A869A] hover:bg-[#F0F4FA]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 space-y-4">
            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-3">Contact Information</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#7A869A]">Email: </span>
                  <span className="text-[#1A2035]">{student.email}</span>
                </div>
                <div>
                  <span className="text-[#7A869A]">Class: </span>
                  <span className="text-[#1A2035]">{student.className}</span>
                </div>
                <div>
                  <span className="text-[#7A869A]">Level: </span>
                  <span className="text-[#1A2035]">Lv.{student.level} {student.levelName}</span>
                </div>
                <div>
                  <span className="text-[#7A869A]">Total XP: </span>
                  <span className="text-[#1A2035]">{student.xp.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-3">Recent Assignments</div>
              {attempts.length === 0 ? (
                <div className="text-sm text-[#7A869A] text-center py-4">No assignments yet</div>
              ) : (
                <div className="space-y-2">
                  {attempts.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 text-xs">
                      <span className="text-[#1A2035] flex-1 font-medium truncate">{a.title}</span>
                      <span className="text-[#7A869A]">{a.subject}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          a.mode === "HOMEWORK"
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : a.mode === "GAME"
                            ? "bg-[#FFF7F4] text-[#FF6B35]"
                            : "bg-[#F5F3FF] text-[#8B5CF6]"
                        }`}
                      >
                        {a.mode}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(a.score)}`}>
                        {a.score}%
                      </span>
                      <span className="text-[#7A869A] ml-auto">{formatDate(a.submitted_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="col-span-2 space-y-4">
            <Card>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Assignments", value: attempts.length },
                  { label: "Avg Score", value: `${student.avgScore}%` },
                  { label: "XP Earned", value: student.xp.toLocaleString() },
                  { label: "Level", value: `#${student.level}` },
                ].map((s) => (
                  <div key={s.label} className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-[#1A2035]">{s.value}</div>
                    <div className="text-[10px] text-[#7A869A]">{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-2">Parent Contact</div>
              <div className="text-xs text-[#7A869A] mb-3">Contact information not available</div>
              <Button size="sm" variant="ghost" className="w-full justify-center text-[#3B82F6]" onClick={() => router.push("/school/doubts")}>
                Message Parent
              </Button>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <Card>
          <div className="text-sm font-semibold text-[#1A2035] mb-4">Assignment Attempts</div>
          {attempts.length === 0 ? (
            <div className="text-sm text-[#7A869A] text-center py-8">No attempts yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0F4FA]">
                  {["Quiz", "Subject", "Mode", "Score", "Date"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-[#7A869A] pb-2 pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-[#F0F4FA] last:border-0">
                    <td className="py-2.5 pr-3 text-xs font-medium text-[#1A2035]">{a.title}</td>
                    <td className="py-2.5 pr-3 text-xs text-[#7A869A]">{a.subject}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          a.mode === "HOMEWORK"
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : a.mode === "GAME"
                            ? "bg-[#FFF7F4] text-[#FF6B35]"
                            : "bg-[#F5F3FF] text-[#8B5CF6]"
                        }`}
                      >
                        {a.mode}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(a.score)}`}>
                        {a.score}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[#7A869A]">{formatDate(a.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <div className="text-sm font-semibold text-[#1A2035] mb-4">Attendance — March 2026</div>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-[#7A869A] pb-1">
                {d}
              </div>
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {Array.from({ length: 22 }, (_, i) => {
              const day = i + 1;
              const isPresent = day !== 7 && day !== 14 && day !== 18;
              return (
                <div
                  key={day}
                  className={`h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isPresent ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FEF2F2] text-[#EF4444]"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="text-sm text-[#7A869A]">
            19/22 days = <span className="font-semibold text-[#F59E0B]">86%</span>
          </div>
          {student.classId && (
            <div className="mt-3 text-xs text-[#7A869A]">Class ID: {student.classId}</div>
          )}
        </Card>
      )}

      {activeTab === 3 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl font-bold text-[#FFB347]">{student.xp.toLocaleString()}</div>
              <span className="text-sm text-[#7A869A]">Total XP</span>
            </div>
            <div className="text-xs font-medium text-[#1A2035] mb-1">
              {student.levelName} → {LEVEL_NAMES[student.level] ?? "Max"}
            </div>
            <ProgressBar value={xpPct} max={100} height={10} color="#FF6B35" />
          </Card>
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">XP Log</div>
            {xpLogs.length === 0 ? (
              <div className="text-sm text-[#7A869A] text-center py-8">No XP history yet</div>
            ) : (
              <div className="space-y-3">
                {xpLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF7F4] flex items-center justify-center text-[#FF6B35] font-bold text-[10px] shrink-0">
                      XP
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#1A2035]">{log.description ?? log.source}</div>
                      <div className="text-[#7A869A]">{log.source}</div>
                    </div>
                    <span className="font-bold text-[#10B981]">+{log.xp_earned} XP</span>
                    <span className="text-[#7A869A]">{formatDate(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 4 && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-[#1A2035] mb-3">Earned Badges</div>
            <div className="grid grid-cols-3 gap-3">
              {MOCK_BADGES.filter((b) => b.earned).map((b, i) => (
                <Card key={i} className="text-center hover:scale-105 transition-transform p-4">
                  <div className="text-4xl mb-2">{b.emoji}</div>
                  <div className="text-sm font-semibold text-[#1A2035]">{b.name}</div>
                  <div className="text-[10px] text-[#7A869A] mb-1">{b.desc}</div>
                  <div className="text-[10px] text-[#7A869A]">Earned {b.date}</div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#1A2035] mb-3">In Progress</div>
            <div className="grid grid-cols-3 gap-3">
              {MOCK_BADGES.filter((b) => !b.earned).map((b, i) => (
                <Card key={i} className="text-center p-4">
                  <div className="text-4xl mb-2 grayscale">{b.emoji}</div>
                  <div className="text-sm font-semibold text-[#1A2035]">{b.name}</div>
                  <div className="text-[10px] text-[#7A869A] mb-2">{b.desc}</div>
                  <ProgressBar value={b.progress ?? 0} max={b.target ?? 100} height={5} />
                  <div className="text-[10px] text-[#7A869A] mt-1">
                    {b.progress}/{b.target}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
