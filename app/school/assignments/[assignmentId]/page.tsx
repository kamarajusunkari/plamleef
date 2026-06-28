"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Breadcrumb } from "@/components/school/Breadcrumb";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { Avatar } from "@/components/school/Avatar";
import { DonutChart } from "@/components/school/DonutChart";
import { ProgressBar } from "@/components/school/ProgressBar";
import { getScoreBadgeClass, getModeBadgeClass } from "@/lib/utils";

const TABS = ["Results", "Analysis", "Settings"];

const AVATAR_COLORS = [
  "#3B82F6", "#EC4899", "#FF6B35", "#10B981", "#8B5CF6",
  "#F59E0B", "#0EA5E9", "#EF4444", "#14B8A6", "#6366F1",
];

const MOCK_ANALYSIS = [
  { q: 1, text: "What is 3/4 + 1/4?", correct: 92, time: "0:45" },
  { q: 2, text: "Simplify 6/8", correct: 88, time: "1:10" },
  { q: 3, text: "Multiply 2/3 × 3/4", correct: 76, time: "1:30" },
  { q: 4, text: "Convert 1½ to improper", correct: 81, time: "1:15" },
  { q: 5, text: "Solve: 2½ − 1¾ (word problem)", correct: 34, time: "3:45" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type ResultRow = {
  id: string;
  studentId: string;
  name: string;
  initials: string;
  color: string;
  score: number | null;
  status: "SUBMITTED" | "PENDING";
  date: string;
  time: string;
};

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<{
    id: string;
    title: string;
    mode: string;
    status: string;
    created_at: string;
    due_date: string | null;
    class_id: string;
    quiz: { title: string; subject: { name: string } | null } | null;
    teachers: { users: { name: string } | null } | null;
    classes: { name: string; section: string } | null;
  } | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [closingOrDeleting, setClosingOrDeleting] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;
    const supabase = createClient();

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch assignment
        const { data: asgn } = await supabase
          .from("assignment")
          .select(
            "id, title, mode, status, created_at, due_date, class_id, quiz:quiz_id(title, subject:subject_id(name)), teachers:teacher_id(users:user_id(name)), classes(name, section)"
          )
          .eq("id", assignmentId)
          .single();

        setAssignment(asgn as any);
        if (!asgn) return;

        // Fetch attempts (submissions)
        const { data: attemptsData } = await supabase
          .from("assignment_attempts")
          .select(
            "id, score, submitted_at, student_records:student_records_id(id, students(id, users:user_id(name, email)))"
          )
          .eq("assignment_id", assignmentId)
          .order("submitted_at", { ascending: false });

        const attempts = attemptsData || [];

        // Count total students in the class
        const { count } = await supabase
          .from("student_records")
          .select("id", { count: "exact", head: true })
          .eq("class_id", asgn.class_id)
          .eq("is_current", true);

        setTotalStudents(count ?? 0);

        // Map submitted results
        const submittedRows: ResultRow[] = attempts.map((a: any, i: number) => {
          const student = a.student_records?.students;
          const user = student?.users;
          const name = user?.name ?? "Unknown";
          const submittedAt = a.submitted_at ? new Date(a.submitted_at) : null;
          return {
            id: a.id,
            studentId: student?.id ?? a.id,
            name,
            initials: getInitials(name),
            color: AVATAR_COLORS[i % AVATAR_COLORS.length],
            score: a.score ?? null,
            status: "SUBMITTED" as const,
            date: submittedAt
              ? submittedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : "—",
            time: submittedAt
              ? submittedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "—",
          };
        });

        // Fetch pending students (those NOT in attempts)
        const submittedStudentIds = attempts
          .map((a: any) => a.student_records?.students?.id)
          .filter(Boolean);

        let pendingRows: ResultRow[] = [];
        if (submittedStudentIds.length > 0) {
          const { data: pendingData } = await supabase
            .from("student_records")
            .select("id, students(id, users:user_id(name, email))")
            .eq("class_id", asgn.class_id)
            .eq("is_current", true)
            .not("student_id", "in", `(${submittedStudentIds.join(",")})`);

          pendingRows = (pendingData || []).map((r: any, i: number) => {
            const user = r.students?.users;
            const name = user?.name ?? "Unknown";
            return {
              id: r.id,
              studentId: r.students?.id ?? r.id,
              name,
              initials: getInitials(name),
              color: AVATAR_COLORS[(submittedRows.length + i) % AVATAR_COLORS.length],
              score: null,
              status: "PENDING" as const,
              date: "—",
              time: "—",
            };
          });
        } else {
          // No submissions yet — all are pending
          const { data: allStudents } = await supabase
            .from("student_records")
            .select("id, students(id, users:user_id(name, email))")
            .eq("class_id", asgn.class_id)
            .eq("is_current", true);

          pendingRows = (allStudents || []).map((r: any, i: number) => {
            const user = r.students?.users;
            const name = user?.name ?? "Unknown";
            return {
              id: r.id,
              studentId: r.students?.id ?? r.id,
              name,
              initials: getInitials(name),
              color: AVATAR_COLORS[i % AVATAR_COLORS.length],
              score: null,
              status: "PENDING" as const,
              date: "—",
              time: "—",
            };
          });
        }

        setResults([...submittedRows, ...pendingRows]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
      </div>
    );
  }

  if (!assignment) {
    return <div className="p-8 text-center text-[#7A869A]">Assignment not found</div>;
  }

  const submitted = results.filter((r) => r.status === "SUBMITTED");
  const pending = results.filter((r) => r.status === "PENDING");
  const submittedCount = submitted.length;
  const pendingCount = pending.length;
  const avgScore =
    submittedCount > 0
      ? Math.round(submitted.reduce((s, r) => s + (r.score ?? 0), 0) / submittedCount)
      : 0;
  const bestScore =
    submittedCount > 0 ? Math.max(...submitted.map((r) => r.score ?? 0)) : 0;

  const displayed =
    statusFilter === "submitted"
      ? submitted
      : statusFilter === "pending"
      ? pending
      : results;

  const closeAssignment = async () => {
    if (!confirm("Close this assignment?")) return;
    const supabase = createClient();
    setClosingOrDeleting(true);
    try {
      const { error } = await supabase
        .from("assignment")
        .update({ status: "CLOSED" })
        .eq("id", assignmentId);
      if (error) throw error;
      setAssignment((prev) => prev ? { ...prev, status: "CLOSED" } : prev);
      toast.success("Assignment closed");
    } catch {
      toast.error("Failed to close assignment");
    } finally {
      setClosingOrDeleting(false);
    }
  };

  const deleteAssignment = async () => {
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    const supabase = createClient();
    setClosingOrDeleting(true);
    try {
      const { error } = await supabase
        .from("assignment")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
      toast.success("Assignment deleted");
      router.push("/school/assignments");
    } catch {
      toast.error("Failed to delete assignment");
      setClosingOrDeleting(false);
    }
  };

  const className = assignment.classes
    ? `${assignment.classes.name} — ${assignment.classes.section}`
    : "Unknown class";
  const teacherName = assignment.teachers?.users?.name ?? "Unknown teacher";
  const subjectName = assignment.quiz?.subject?.name ?? "Unknown subject";
  const displayTotal = totalStudents || results.length;

  return (
    <div className="animate-fadeIn">
      <Breadcrumb
        items={[
          { label: "Assignments", href: "/school/assignments" },
          { label: assignment.title },
        ]}
      />

      <Card className="mb-6">
        <div className="flex items-center gap-5">
          <DonutChart
            segments={[
              { value: submittedCount, color: "#FF6B35", label: "Submitted" },
              {
                value: Math.max(0, displayTotal - submittedCount),
                color: "#F0F4FA",
                label: "Pending",
              },
            ]}
            total={displayTotal}
            centerLabel={
              displayTotal > 0
                ? `${Math.round((submittedCount / displayTotal) * 100)}%`
                : "0%"
            }
            centerSub="done"
            size={100}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getModeBadgeClass(assignment.mode)}`}
              >
                {assignment.mode}
              </span>
              <h1 className="text-lg font-bold text-[#1A2035]">{assignment.title}</h1>
            </div>
            <div className="text-sm text-[#7A869A] mb-2">
              {className} · {teacherName} · {subjectName}
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-[#7A869A]">Submitted: </span>
                <span className="font-semibold text-[#1A2035]">
                  {submittedCount}/{displayTotal}
                </span>
              </div>
              <div>
                <span className="text-[#7A869A]">Avg Score: </span>
                <span
                  className={`font-semibold ${
                    avgScore >= 75
                      ? "text-[#10B981]"
                      : avgScore >= 50
                      ? "text-[#F59E0B]"
                      : "text-[#EF4444]"
                  }`}
                >
                  {submittedCount > 0 ? `${avgScore}%` : "—"}
                </span>
              </div>
              <div>
                <span className="text-[#7A869A]">Best: </span>
                <span className="font-semibold text-[#10B981]">
                  {submittedCount > 0 ? `${bestScore}%` : "—"}
                </span>
              </div>
            </div>
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

      {/* Tab 0: Results */}
      {activeTab === 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {["all", "submitted", "pending"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full capitalize transition-all ${
                    statusFilter === f
                      ? "bg-[#FF6B35] text-white"
                      : "border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                toast.success(`Reminder sent to ${pendingCount} pending student${pendingCount !== 1 ? "s" : ""}`)
              }
            >
              Send Reminder to Pending
            </Button>
          </div>
          {displayed.length === 0 ? (
            <div className="text-center text-sm text-[#7A869A] py-8">No results to show</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0F4FA]">
                  {["Student", "Score%", "Date", "Time", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-[#7A869A] pb-2 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#F0F4FA] last:border-0 hover:bg-[#F8FAFC] cursor-pointer"
                    onClick={() => router.push(`/school/students/${r.studentId}`)}
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Avatar initials={r.initials} color={r.color} size={32} />
                        <span className="text-xs font-medium text-[#1A2035] hover:text-[#FF6B35]">
                          {r.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {r.status === "SUBMITTED" && r.score !== null ? (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(r.score)}`}
                        >
                          {r.score}%
                        </span>
                      ) : (
                        <span className="text-xs text-[#7A869A]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-[#7A869A]">{r.date}</td>
                    <td className="py-2.5 pr-4 text-xs text-[#7A869A]">{r.time}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          r.status === "SUBMITTED"
                            ? "bg-[#ECFDF5] text-[#10B981]"
                            : "bg-[#FFFBEB] text-[#F59E0B]"
                        }`}
                      >
                        {r.status === "SUBMITTED" ? "Submitted" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Tab 1: Analysis */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">
              Question-by-Question Analysis
            </div>
            <div className="space-y-3">
              {MOCK_ANALYSIS.map((q) => (
                <div key={q.q} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-[#7A869A] w-6">Q{q.q}</span>
                  <div className="flex-1 text-xs text-[#1A2035] truncate">{q.text}</div>
                  <ProgressBar value={q.correct} height={8} className="w-32" />
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadgeClass(q.correct)}`}
                  >
                    {q.correct}%
                  </span>
                  <span className="text-[10px] text-[#7A869A] w-12 text-right">{q.time}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-l-4 border-l-[#EF4444]">
            <div className="text-sm font-semibold text-[#EF4444]">
              ⚠ Most Missed: Q5 — Word problem (34%)
            </div>
            <div className="text-xs text-[#7A869A] mt-1">
              Students found the word problem most challenging. Consider revision session.
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-3">Score Distribution</div>
              <div className="space-y-2">
                {((): { label: string; count: number }[] => {
                  const buckets = [
                    { label: "90-100%", count: 0 },
                    { label: "80-89%", count: 0 },
                    { label: "70-79%", count: 0 },
                    { label: "60-69%", count: 0 },
                    { label: "Below 60%", count: 0 },
                  ];
                  submitted.forEach((r) => {
                    const s = r.score ?? 0;
                    if (s >= 90) buckets[0].count++;
                    else if (s >= 80) buckets[1].count++;
                    else if (s >= 70) buckets[2].count++;
                    else if (s >= 60) buckets[3].count++;
                    else buckets[4].count++;
                  });
                  return buckets;
                })().map(({ label, count }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-16 text-[10px] text-[#7A869A]">{label}</div>
                    <div className="flex-1 h-4 bg-[#F0F4FA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF6B35] rounded-full"
                        style={{
                          width: `${
                            submittedCount > 0 ? (count / submittedCount) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#7A869A] w-4">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div className="text-sm font-semibold text-[#1A2035] mb-3">Class vs School Avg</div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-[#7A869A] mb-1">
                    <span>This class</span>
                    <span className="font-semibold text-[#10B981]">
                      {submittedCount > 0 ? `${avgScore}%` : "—"}
                    </span>
                  </div>
                  <ProgressBar value={avgScore} height={8} color="#10B981" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-[#7A869A] mb-1">
                    <span>School avg</span>
                    <span>74%</span>
                  </div>
                  <ProgressBar value={74} height={8} color="#F59E0B" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-[#7A869A] mb-1">
                    <span>National avg</span>
                    <span>71%</span>
                  </div>
                  <ProgressBar value={71} height={8} color="#94A3B8" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Settings */}
      {activeTab === 2 && (
        <Card>
          <div className="text-sm font-semibold text-[#1A2035] mb-4">Assignment Settings</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl">
              <div>
                <div className="text-sm font-medium text-[#1A2035]">Status</div>
                <div className="text-xs text-[#7A869A]">{assignment.status}</div>
              </div>
              <div className="flex gap-2">
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                    assignment.status === "ACTIVE"
                      ? "bg-[#ECFDF5] text-[#10B981]"
                      : assignment.status === "CLOSED"
                      ? "bg-[#F1F5F9] text-[#64748B]"
                      : "bg-[#FFFBEB] text-[#F59E0B]"
                  }`}
                >
                  {assignment.status}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="danger"
                onClick={closeAssignment}
                disabled={closingOrDeleting || assignment.status === "CLOSED"}
              >
                {assignment.status === "CLOSED" ? "Already Closed" : "Close Assignment"}
              </Button>
              <Button
                variant="ghost"
                onClick={deleteAssignment}
                disabled={closingOrDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
