"use client";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/school/PageHeader";
import { Card } from "@/components/school/Card";
import { LeaderboardPodium } from "@/components/school/LeaderboardPodium";
import { Avatar } from "@/components/school/Avatar";
import { getScoreBadgeClass } from "@/lib/utils";

const PERIODS = ["Daily", "Weekly", "Monthly", "Yearly"];

const STUDENT_COLORS = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6", "#EF4444", "#F59E0B", "#06B6D4", "#8B5CF6"];

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  initials: string;
  color: string;
  className: string;
  xp: number;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  accuracy: number;
}

interface ClassEntry {
  rank: number;
  classId: string;
  name: string;
  totalXp: number;
  medal: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

export default function LeaderboardPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [period, setPeriod] = useState("Weekly");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [classLeaderboard, setClassLeaderboard] = useState<ClassEntry[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user?.schoolId) return;

    async function fetchAll() {
      setLoadingData(true);
      const supabase = createClient();
      const schoolId = user!.schoolId!;

      // Fetch individual leaderboard with nested joins
      const { data: rawLeaderboard } = await supabase
        .from("leaderboards")
        .select(`
          rank, xp, score, games_played, games_won, accuracy_pct,
          student_record:student_records_id (
            student:student_id ( users:user_id ( name ) ),
            class:class_id ( name, section )
          )
        `)
        .eq("school_id", schoolId)
        .order("rank", { ascending: true })
        .limit(50);

      if (rawLeaderboard) {
        const mapped: LeaderboardEntry[] = rawLeaderboard.map((e: any, i: number) => {
          const sr = Array.isArray(e.student_record) ? e.student_record[0] : e.student_record;
          const studentObj = sr?.student ? (Array.isArray(sr.student) ? sr.student[0] : sr.student) : null;
          const userObj = studentObj?.users ? (Array.isArray(studentObj.users) ? studentObj.users[0] : studentObj.users) : null;
          const cls = sr?.class ? (Array.isArray(sr.class) ? sr.class[0] : sr.class) : null;

          const name = userObj?.name ?? "Unknown";
          return {
            rank: e.rank,
            studentId: "",
            name,
            initials: name.slice(0, 2).toUpperCase(),
            color: STUDENT_COLORS[i % STUDENT_COLORS.length],
            className: cls ? `${cls.name}-${cls.section}` : "",
            xp: e.xp ?? 0,
            score: e.score ?? 0,
            gamesPlayed: e.games_played ?? 0,
            gamesWon: e.games_won ?? 0,
            accuracy: e.accuracy_pct ?? 0,
          };
        });
        setEntries(mapped);
      }

      // Fetch class XP data and aggregate
      const { data: xpRows } = await supabase
        .from("student_xp")
        .select("class_id, total_xp, classes:class_id(name, section)")
        .eq("school_id", schoolId);

      if (xpRows) {
        const aggregated: Record<string, { classId: string; name: string; totalXp: number }> = {};
        for (const row of xpRows as any[]) {
          const cls = row.classes ? (Array.isArray(row.classes) ? row.classes[0] : row.classes) : null;
          const classId = row.class_id;
          const clsName = cls ? `${cls.name}-${cls.section}` : classId;
          if (!aggregated[classId]) {
            aggregated[classId] = { classId, name: clsName, totalXp: 0 };
          }
          aggregated[classId].totalXp += row.total_xp ?? 0;
        }

        const sorted = Object.values(aggregated)
          .sort((a, b) => b.totalXp - a.totalXp)
          .map((cls, i) => ({
            rank: i + 1,
            classId: cls.classId,
            name: cls.name,
            totalXp: cls.totalXp,
            medal: i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null,
          }));

        setClassLeaderboard(sorted);
      }

      // Fetch classes for filter dropdown
      const { data: classRows } = await supabase
        .from("classes")
        .select("id, name, section")
        .eq("school_id", schoolId);

      if (classRows) setClasses(classRows);

      setLoadingData(false);
    }

    fetchAll();
  }, [user?.schoolId]);

  const isLoading = userLoading || loadingData;

  const filteredEntries = classFilter === "all"
    ? entries
    : entries.filter((e) => {
        const cls = classes.find((c) => c.id === classFilter);
        return cls ? e.className === `${cls.name}-${cls.section}` : true;
      });

  const top3 = filteredEntries.slice(0, 3);
  const maxXp = classLeaderboard[0]?.totalXp ?? 1;

  const rankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const leadingClass = classLeaderboard[0];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="School Leaderboard"
        subtitle="Live rankings"
      />

      {/* Period tabs */}
      <div className="flex gap-1 mb-5">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === p ? "bg-[#FF6B35] text-white" : "text-[#7A869A] hover:bg-[#F0F4FA]"}`}
          >
            {p}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-xs border border-[#E8EDF5] rounded-xl px-3 py-2 bg-white text-[#1A2035] focus:outline-none"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
            ))}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-xs border border-[#E8EDF5] rounded-xl px-3 py-2 bg-white text-[#1A2035] focus:outline-none"
          >
            <option value="all">All Subjects</option>
          </select>
        </div>
      </div>

      {/* Leading class chip */}
      {!isLoading && leadingClass && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-[#FFF7F4] text-[#FF6B35] font-medium border border-[#FF6B35]/20">
            🏫 {leadingClass.name} leads — {leadingClass.totalXp.toLocaleString()} XP total
          </span>
          <span className="text-xs text-[#7A869A]">{period} leaderboard</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-sm text-[#7A869A]">No leaderboard data yet</div>
        </Card>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 1 && (
            <Card className="mb-6">
              <LeaderboardPodium top3={top3} />
            </Card>
          )}

          {/* Rankings table */}
          <Card className="mb-6">
            <div className="text-sm font-semibold text-[#1A2035] mb-4">Individual Rankings</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F0F4FA]">
                    {["Rank", "Student", "Class", "XP", "Score%", "Games Won", "Games Played", "Accuracy"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-[#7A869A] pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const badge = rankBadge(entry.rank);
                    return (
                      <tr key={`${entry.rank}-${entry.name}`} className="border-b border-[#F0F4FA] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 pr-4">
                          {badge ? (
                            <span className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full ${
                              entry.rank === 1 ? "bg-[#FFFBEB] text-[#FFB347]" :
                              entry.rank === 2 ? "bg-[#F1F5F9] text-[#94A3B8]" :
                              "bg-[#FEF2F2] text-[#CD7F32]"
                            }`}>
                              {badge} {entry.rank}
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#7A869A]">#{entry.rank}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar initials={entry.initials} color={entry.color} size={32} />
                            <span className="text-sm font-medium text-[#1A2035]">{entry.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">{entry.className}</span>
                        </td>
                        <td className="py-3 pr-4 text-sm font-bold text-[#FFB347]">{entry.xp.toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(entry.score)}`}>{entry.score}%</span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-[#1A2035]">{entry.gamesWon}</td>
                        <td className="py-3 pr-4 text-sm text-[#1A2035]">{entry.gamesPlayed}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(entry.accuracy)}`}>{entry.accuracy}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Class leaderboard */}
          {classLeaderboard.length > 0 && (
            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-4">Class Leaderboard</div>
              <div className="space-y-3">
                {classLeaderboard.map((cls) => (
                  <div key={cls.classId} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      cls.rank === 1 ? "bg-[#FFFBEB] text-[#FFB347]" :
                      cls.rank === 2 ? "bg-[#F1F5F9] text-[#94A3B8]" :
                      cls.rank === 3 ? "bg-[#FEF9F0] text-[#CD7F32]" :
                      "bg-[#F1F5F9] text-[#7A869A]"
                    }`}>
                      {cls.medal || cls.rank}
                    </div>
                    <div className="w-28 text-sm font-medium text-[#1A2035] truncate">{cls.name}</div>
                    <div className="flex-1 h-6 bg-[#F0F4FA] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center px-2 transition-[width] duration-700"
                        style={{
                          width: `${Math.max((cls.totalXp / maxXp) * 100, 4)}%`,
                          backgroundColor: cls.rank <= 3 ? "#FF6B35" : "#3B82F6",
                        }}
                      >
                        <span className="text-white text-[9px] font-bold">{cls.totalXp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
