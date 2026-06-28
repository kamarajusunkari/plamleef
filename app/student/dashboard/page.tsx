"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Swords, BookOpen, Trophy, Zap, Star, CheckCircle, Clock, TrendingUp, Play, Bell } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

// XP level thresholds (index = level - 1)
const XP_THRESHOLDS = [0, 250, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6500, 8000, 10000];
const LEVEL_NAMES = ["Rookie", "Explorer", "Scholar", "Achiever", "Champion", "Elite", "Master", "Legend", "Grandmaster", "Expert", "Prodigy", "Genius"];

function getNextThreshold(level: number): number {
  return XP_THRESHOLDS[level] ?? 10000;
}
function getPrevThreshold(level: number): number {
  return XP_THRESHOLDS[level - 1] ?? 0;
}
function calcXpPct(xp: number, level: number): number {
  const prev = getPrevThreshold(level);
  const next = getNextThreshold(level);
  if (next <= prev) return 100;
  return Math.min(((xp - prev) / (next - prev)) * 100, 100);
}

// Deterministic avatar color
function avatarColor(name: string): string {
  const colors = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EC4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface AssignmentRow {
  id: string;
  quizId: string;
  title: string;
  duedate: string;
  quiz: { id: string; count: number; difficulty: string; subject: { name: string } | null } | null;
  attempt: { score: number } | null;
  status: "PENDING" | "COMPLETED" | "OVERDUE";
}

interface LeaderboardRow {
  rank: number;
  xp: number;
  student_records_id: string;
  userName: string;
  isMe: boolean;
}

interface XpDay {
  date: string;
  xp: number;
}

interface SubjectRow {
  id: string;
  name: string;
}

export default function StudentDashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const [xpDisplay, setXpDisplay] = useState(0);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [xpHistory, setXpHistory] = useState<XpDay[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [doubtsCount, setDoubtsCount] = useState(0);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; content: string; audience: string; created_at: string }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const xp = user?.totalXp ?? 0;
  const level = user?.level ?? 1;
  const levelName = LEVEL_NAMES[level - 1] ?? "Rookie";
  const xpPct = calcXpPct(xp, level);
  const xpToNext = getNextThreshold(level) - xp;

  // Animate XP counter
  useEffect(() => {
    if (!xp) return;
    let current = 0;
    const step = Math.ceil(xp / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= xp) { setXpDisplay(xp); clearInterval(timer); }
      else setXpDisplay(current);
    }, 30);
    return () => clearInterval(timer);
  }, [xp]);

  // Fetch dashboard data
  useEffect(() => {
    if (!user?.studentRecordId || !user?.classId || !user?.schoolId) return;

    let cancelled = false;

    async function fetchData() {
      if (!user?.studentRecordId || !user?.classId || !user?.schoolId) return;
      setDataLoading(true);
      const supabase = createClient();

      // Run queries in parallel
      const [assignmentsRes, leaderboardRes, xpLogsRes, subjectsRes, rankRes, doubtsRes, announcementsRes] = await Promise.all([
        // Assignments for class + attempts
        supabase
          .from("assignment")
          .select(`
            id,
            title,
            duedate,
            quiz:quiz_id (
              id,
              count,
              difficulty,
              subject:subject_id ( name )
            )
          `)
          .eq("class_id", user.classId)
          .eq("status", "ACTIVE")
          .order("duedate", { ascending: true })
          .limit(6),

        // Class leaderboard top 5
        supabase
          .from("leaderboards")
          .select(`
            rank,
            xp,
            student_records_id,
            student_records!inner (
              students!inner (
                users!inner ( name )
              )
            )
          `)
          .eq("class_id", user.classId)
          .order("rank", { ascending: true })
          .limit(5),

        // XP logs last 7 days
        supabase
          .from("xp_logs")
          .select("xp, created_at")
          .eq("student_records_id", user.studentRecordId)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

        // Subjects for class
        supabase
          .from("class_subjects")
          .select("subject:subject_id ( id, name )")
          .eq("class_id", user.classId),

        // Current student rank
        supabase
          .from("leaderboards")
          .select("rank")
          .eq("student_records_id", user.studentRecordId)
          .maybeSingle(),

        // Open doubts count
        supabase
          .from("doubts")
          .select("id", { count: "exact", head: true })
          .eq("student_records_id", user.studentRecordId)
          .eq("status", "OPEN"),

        // Recent announcements
        supabase
          .from("announcements")
          .select("id, title, content, audience, created_at")
          .eq("school_id", user.schoolId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      // Process assignments + attempts
      const rawAssignments = assignmentsRes.data ?? [];
      const assignmentIds = rawAssignments.map((a) => a.id as string);
      let attemptMap = new Map<string, { score: number }>();

      if (assignmentIds.length > 0) {
        const { data: attempts } = await supabase
          .from("assignment_attempts")
          .select("assignment_id, score")
          .eq("student_records_id", user.studentRecordId)
          .in("assignment_id", assignmentIds);
        (attempts ?? []).forEach((att) => {
          attemptMap.set(att.assignment_id, { score: att.score });
        });
      }

      if (cancelled) return;

      const mappedAssignments: AssignmentRow[] = rawAssignments.map((a) => {
        const quiz = a.quiz as { id: string; count: number; difficulty: string; subject: { name: string } | null } | null;
        const attempt = attemptMap.get(a.id as string) ?? null;
        const dueDate = (a.duedate as string) ?? new Date().toISOString();
        let status: AssignmentRow["status"];
        if (attempt) status = "COMPLETED";
        else if (new Date(dueDate) < new Date()) status = "OVERDUE";
        else status = "PENDING";

        return {
          id:     a.id as string,
          quizId: quiz?.id ?? "",
          title:  (a.title as string) || "Assignment",
          duedate: dueDate,
          quiz,
          attempt,
          status,
        };
      });

      // Process leaderboard
      const rawLb = leaderboardRes.data ?? [];
      const mappedLb: LeaderboardRow[] = rawLb.map((row) => {
        // Deep-traverse joined tables
        const sr = Array.isArray(row.student_records) ? row.student_records[0] : row.student_records;
        const stu = sr ? (Array.isArray(sr.students) ? sr.students[0] : sr.students) : null;
        const usr = stu ? (Array.isArray(stu.users) ? stu.users[0] : stu.users) : null;
        const name = (usr as { name?: string } | null)?.name ?? "Student";
        return {
          rank: row.rank as number,
          xp: row.xp as number,
          student_records_id: row.student_records_id as string,
          userName: name,
          isMe: row.student_records_id === user!.studentRecordId,
        };
      });

      // Process XP history (group by date)
      const rawLogs = xpLogsRes.data ?? [];
      const dayMap = new Map<string, number>();
      rawLogs.forEach((log) => {
        const day = new Date(log.created_at as string).toLocaleDateString("en-US", { weekday: "short" });
        dayMap.set(day, (dayMap.get(day) ?? 0) + (log.xp as number));
      });
      // Build last 7 days
      const days: XpDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        days.push({ date: label, xp: dayMap.get(label) ?? 0 });
      }
      // Deduplicate days (keep last occurrence for each label)
      const seen = new Set<string>();
      const uniqueDays = days.filter((d) => { if (seen.has(d.date)) return false; seen.add(d.date); return true; });

      // Process subjects
      const rawSubjects = subjectsRes.data ?? [];
      const mappedSubjects: SubjectRow[] = rawSubjects
        .map((cs) => {
          const sub = Array.isArray(cs.subject) ? cs.subject[0] : cs.subject;
          return sub as { id: string; name: string } | null;
        })
        .filter(Boolean)
        .map((s) => ({ id: s!.id, name: s!.name }));

      setAssignments(mappedAssignments);
      setLeaderboard(mappedLb);
      setXpHistory(uniqueDays);
      setSubjects(mappedSubjects);
      setRank(rankRes.data?.rank ?? null);
      setDoubtsCount(doubtsRes.count ?? 0);
      const annData = (announcementsRes.data ?? []).map((a: any) => ({
        ...a,
        audience: Array.isArray(a.audience) ? a.audience[0] : a.audience,
      }));
      setAnnouncements(annData);
      setDataLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [user?.studentRecordId, user?.classId]);

  const pendingAssignments = assignments.filter((a) => a.status === "PENDING" || a.status === "OVERDUE");
  const xpWeekTotal = xpHistory.reduce((sum, d) => sum + d.xp, 0);
  const xpMax = Math.max(...xpHistory.map((d) => d.xp), 1);

  // XP milestone badges (since no badges table)
  const milestones = [
    { level: 1, icon: "🌱", name: "First Steps" },
    { level: 3, icon: "📚", name: "Scholar" },
    { level: 5, icon: "🏆", name: "Champion" },
    { level: 8, icon: "⭐", name: "Legend" },
  ];
  const earnedMilestones = milestones.filter((m) => level >= m.level);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero XP card */}
      <div className="bg-[#0A1628] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5" style={{ background: "radial-gradient(circle, #FF6B35, transparent)" }} />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="text-lg font-bold mb-0.5">Hey, {user?.name?.split(" ")[0] ?? "Student"}! 🚀</div>
            <div className="text-[#94A3B8] text-sm">
              Level {level} · {levelName}
              {rank != null && ` · Rank #${rank}`}
              {user?.className && ` · ${user.className}`}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div>
                <div className="text-3xl font-bold text-[#FFB347]">{xpDisplay.toLocaleString()}</div>
                <div className="text-[10px] text-[#7A869A]">Total XP</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-xl font-bold text-[#10B981]">{subjects.length}</div>
                <div className="text-[10px] text-[#7A869A]">Subjects</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-xl font-bold text-[#FF6B35]">{doubtsCount}</div>
                <div className="text-[10px] text-[#7A869A]">Open doubts</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#7A869A] mb-1">XP to Level {level + 1}</div>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFB347] rounded-full transition-[width] duration-700" style={{ width: `${xpPct}%` }} />
            </div>
            <div className="text-[10px] text-[#7A869A] mt-1">{xpToNext.toLocaleString()} XP needed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: assignments + xp chart */}
        <div className="xl:col-span-2 space-y-4">
          {/* Pending assignments */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[#FF6B35]" />
                <span className="text-sm font-semibold text-[#1A2035]">My Assignments</span>
                {pendingAssignments.length > 0 && (
                  <span className="text-[10px] font-bold text-white bg-[#EF4444] px-1.5 py-0.5 rounded-full">{pendingAssignments.length} due</span>
                )}
              </div>
              <Link href="/student/assignments" className="text-xs text-[#FF6B35] hover:underline">View all →</Link>
            </div>

            {dataLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-[#F8FAFC] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#7A869A]">No assignments yet</div>
            ) : (
              <div className="space-y-2">
                {assignments.slice(0, 4).map((a) => {
                  const quiz = a.quiz;
                  const subjectName = quiz?.subject?.name ?? "General";
                  const questionCount = quiz?.count ?? 10;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm bg-[#FFF7F4]">
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#1A2035] truncate">{a.title}</div>
                        <div className="text-[10px] text-[#7A869A]">{subjectName} · {questionCount} questions</div>
                      </div>
                      {a.status === "COMPLETED" ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle size={14} className="text-[#10B981]" />
                          <span className="text-xs font-bold text-[#10B981]">{a.attempt?.score}%</span>
                        </div>
                      ) : a.status === "OVERDUE" ? (
                        <span className="text-[10px] font-bold text-white bg-[#EF4444] px-2 py-0.5 rounded-full">Overdue</span>
                      ) : (
                        <Link
                          href={`/student/quiz?id=${a.id}&quizId=${a.quizId}&title=${encodeURIComponent(a.title)}&subject=${encodeURIComponent(subjectName)}&questions=${questionCount}&time=30&xp=${Math.round(questionCount * 3)}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FF6B35] text-white rounded-xl text-[10px] font-bold hover:bg-[#E55A28] transition-colors"
                        >
                          <Play size={10} /> Start
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* XP Bar chart */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#8B5CF6]" />
                <span className="text-sm font-semibold text-[#1A2035]">XP This Week</span>
              </div>
              {xpWeekTotal > 0 && (
                <span className="text-xs font-bold text-[#10B981]">+{xpWeekTotal.toLocaleString()} total</span>
              )}
            </div>
            {dataLoading ? (
              <div className="h-16 bg-[#F8FAFC] rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-end gap-2 h-16">
                {xpHistory.map((d, i) => {
                  const pct = (d.xp / xpMax) * 100;
                  return (
                    <div key={`${d.date}-${i}`} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-lg"
                        style={{ height: `${Math.max(pct, d.xp > 0 ? 10 : 0)}%`, background: "#FF6B35", opacity: i === xpHistory.length - 1 ? 1 : 0.5 }}
                      />
                      <div className="text-[9px] text-[#7A869A]">{d.date}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {!dataLoading && xpWeekTotal === 0 && (
              <div className="text-center py-4 text-xs text-[#7A869A]">No XP earned this week yet</div>
            )}
          </div>

          {/* Subjects */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords size={14} className="text-[#3B82F6]" />
                <span className="text-sm font-semibold text-[#1A2035]">My Subjects</span>
              </div>
              <Link href="/student/subjects" className="text-xs text-[#FF6B35] hover:underline">View all →</Link>
            </div>
            {dataLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 w-24 bg-[#F8FAFC] rounded-lg animate-pulse" />)}
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-sm text-[#7A869A]">No subjects assigned</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    href="/student/subjects"
                    className="px-3 py-1.5 bg-[#F0F4FA] text-[#1A2035] text-xs font-medium rounded-xl hover:bg-[#E8EDF5] transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: leaderboard + badges */}
        <div className="space-y-4">
          {/* Class leaderboard preview */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-[#FFB347]" />
                <span className="text-sm font-semibold text-[#1A2035]">Class Rank</span>
              </div>
              <Link href="/student/leaderboard" className="text-xs text-[#FF6B35] hover:underline">View →</Link>
            </div>
            {dataLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-[#F8FAFC] rounded-xl animate-pulse" />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-sm text-[#7A869A] text-center py-4">No rankings yet</div>
            ) : (
              leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center gap-2.5 py-2 border-b border-[#F0F4FA] last:border-0 rounded-xl px-2"
                  style={{ background: entry.isMe ? "#FFF7F4" : "transparent" }}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${entry.rank === 1 ? "bg-[#FFB347] text-white" : entry.rank === 2 ? "bg-[#94A3B8] text-white" : entry.rank === 3 ? "bg-[#CD7F32] text-white" : "bg-[#F0F4FA] text-[#7A869A]"}`}>
                    {entry.rank}
                  </div>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: avatarColor(entry.userName) }}>
                    {entry.userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-semibold truncate ${entry.isMe ? "text-[#FF6B35]" : "text-[#1A2035]"}`}>
                      {entry.userName} {entry.isMe && "⭐"}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-[#8B5CF6]">{entry.xp.toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          {/* XP Milestone badges */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-[#FFB347]" />
                <span className="text-sm font-semibold text-[#1A2035]">Milestones ({earnedMilestones.length})</span>
              </div>
              <Link href="/student/badges" className="text-xs text-[#FF6B35] hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {milestones.map((m) => {
                const earned = level >= m.level;
                return (
                  <div
                    key={m.level}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors"
                    style={{ background: earned ? "#F8FAFC" : "#F8FAFC", opacity: earned ? 1 : 0.4 }}
                    title={earned ? `${m.name} — earned!` : `Reach Level ${m.level} to unlock`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[9px] text-[#7A869A] text-center leading-tight">{m.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="text-sm font-semibold text-[#1A2035] mb-3">Quick Actions</div>
            <div className="space-y-2">
              <Link href="/student/doubts" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F0F4FA] hover:bg-[#E8EDF5] transition-colors text-xs font-medium text-[#1A2035]">
                💬 Ask a Doubt
                {doubtsCount > 0 && <span className="ml-auto text-[10px] font-bold text-white bg-[#F59E0B] px-1.5 py-0.5 rounded-full">{doubtsCount} open</span>}
              </Link>
              <Link href="/student/attendance" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F0F4FA] hover:bg-[#E8EDF5] transition-colors text-xs font-medium text-[#1A2035]">
                📅 My Attendance
              </Link>
              <Link href="/student/play" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FFF7F4] hover:bg-[#FFE9DC] transition-colors text-xs font-medium text-[#FF6B35] font-semibold">
                <Swords size={12} /> Game Zone
              </Link>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-[#FF6B35]" />
                <span className="text-sm font-semibold text-[#1A2035]">Announcements</span>
              </div>
              <Link href="/student/announcements" className="text-xs text-[#FF6B35] hover:underline">View all</Link>
            </div>
            {announcements.length === 0 ? (
              <div className="text-sm text-[#7A869A] text-center py-4">No announcements</div>
            ) : (
              <div className="space-y-2">
                {announcements.map((ann) => (
                  <div key={ann.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF7F4] flex items-center justify-center shrink-0">
                      <Bell size={12} className="text-[#FF6B35]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1A2035] truncate">{ann.title}</div>
                      <div className="text-[10px] text-[#7A869A] line-clamp-1">{ann.content}</div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5">
                        {new Date(ann.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 mt-0.5 bg-[#EFF6FF] text-[#3B82F6]">
                      {ann.audience === "ALL" ? "All" : ann.audience.charAt(0) + ann.audience.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
