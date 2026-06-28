"use client";
import React, { useEffect, useState } from "react";
import { ClipboardList, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
  PENDING: { bg: "#FFFBEB", color: "#F59E0B", label: "Pending", icon: <Clock size={12} /> },
  COMPLETED: { bg: "#ECFDF5", color: "#10B981", label: "Completed", icon: <CheckCircle size={12} /> },
  OVERDUE: { bg: "#FEF2F2", color: "#EF4444", label: "Overdue", icon: <AlertTriangle size={12} /> },
};

const FILTERS = ["ALL", "PENDING", "COMPLETED", "OVERDUE"] as const;

interface AssignmentRow {
  id: string;
  title: string;
  duedate: string;
  subject_name: string;
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  score: number | null;
  xp_earned: number | null;
}

export default function ParentAssignmentsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState("your child");
  const [filter, setFilter] = useState<typeof FILTERS[number]>("ALL");

  useEffect(() => {
    if (userLoading || !user || user.role !== "PARENT") return;
    const supabase = createClient();

    async function fetchAssignments() {
      setLoading(true);
      try {
        const { data: studentRow } = await supabase
          .from("students")
          .select("id, user_id")
          .eq("parent_user_id", user!.id)
          .maybeSingle();

        if (!studentRow) return;

        const [{ data: childUser }, { data: record }] = await Promise.all([
          supabase.from("users").select("name").eq("id", studentRow.user_id).single(),
          supabase
            .from("student_records")
            .select("id, class_id")
            .eq("student_id", studentRow.id)
            .eq("is_current", true)
            .maybeSingle(),
        ]);

        if (childUser?.name) setChildName(childUser.name);
        if (!record) return;

        const recordId = record.id;
        const classId = record.class_id;

        const { data: assignmentRows } = await supabase
          .from("assignment")
          .select("id, title, duedate, status, subjects(name)")
          .eq("class_id", classId)
          .order("duedate", { ascending: false });

        if (!assignmentRows || assignmentRows.length === 0) return;

        const assignmentIds = assignmentRows.map(a => a.id);
        const { data: attemptRows } = await supabase
          .from("assignment_attempts")
          .select("assignment_id, score, xp_earned")
          .eq("student_records_id", recordId)
          .in("assignment_id", assignmentIds);

        const attemptMap = new Map(attemptRows?.map(at => [at.assignment_id, at]) ?? []);
        const now = new Date();

        const list: AssignmentRow[] = assignmentRows.map(a => {
          const subj = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects as { name: string } | null;
          const attempt = attemptMap.get(a.id);
          const isDue = new Date(a.duedate) < now;
          let status: "PENDING" | "COMPLETED" | "OVERDUE" = "PENDING";
          if (attempt) status = "COMPLETED";
          else if (isDue) status = "OVERDUE";
          return {
            id: a.id,
            title: a.title,
            duedate: a.duedate,
            subject_name: subj?.name ?? "—",
            status,
            score: attempt?.score ?? null,
            xp_earned: attempt?.xp_earned ?? null,
          };
        });

        setAssignments(list);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [user, userLoading]);

  const filtered = filter === "ALL" ? assignments : assignments.filter(a => a.status === filter);

  const counts = {
    PENDING: assignments.filter(a => a.status === "PENDING").length,
    COMPLETED: assignments.filter(a => a.status === "COMPLETED").length,
    OVERDUE: assignments.filter(a => a.status === "OVERDUE").length,
  };

  if (loading || userLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
        <div className="h-8 w-48 bg-[#F0F4FA] rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-[#E8EDF5] animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-[#E8EDF5] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Assignments</h1>
        <p className="text-sm text-[#7A869A]">{childName}&apos;s current assignments and submission status</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: counts.PENDING, color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Completed", value: counts.COMPLETED, color: "#10B981", bg: "#ECFDF5" },
          { label: "Overdue", value: counts.OVERDUE, color: "#EF4444", bg: "#FEF2F2" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: s.bg }}>
              <span style={{ color: s.color }} className="font-bold text-base">{s.value}</span>
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#7A869A]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: filter === f ? "#10B981" : "white",
              color: filter === f ? "white" : "#7A869A",
              border: filter === f ? "none" : "1px solid #E8EDF5",
            }}
          >
            {f === "ALL" ? `All (${assignments.length})` : `${f.charAt(0) + f.slice(1).toLowerCase()} (${counts[f as keyof typeof counts]})`}
          </button>
        ))}
      </div>

      {/* Assignment list */}
      <div className="space-y-3">
        {filtered.map(a => {
          const s = STATUS_STYLE[a.status];
          return (
            <div key={a.id} className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: s.bg }}>
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-[#1A2035]">{a.title}</div>
                    <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.color }}>
                      {s.icon}
                      {s.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#7A869A]">
                    <span className="flex items-center gap-1">
                      <ClipboardList size={10} />
                      {a.subject_name}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Due {a.duedate?.split("T")[0]}
                    </span>
                  </div>
                  {a.status === "COMPLETED" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#10B981]">✓ Submitted</span>
                      {a.score != null && (
                        <>
                          <span className="text-xs text-[#7A869A]">·</span>
                          <span className="text-xs font-bold text-[#3B82F6]">Score: {a.score}%</span>
                        </>
                      )}
                      {a.xp_earned != null && (
                        <>
                          <span className="text-xs text-[#7A869A]">·</span>
                          <span className="text-xs font-bold text-[#FF6B35]">+{a.xp_earned} XP</span>
                        </>
                      )}
                    </div>
                  )}
                  {a.status === "OVERDUE" && (
                    <div className="mt-2 text-xs text-[#EF4444] font-medium">
                      ⚠️ Please remind {childName.split(" ")[0]} to complete this assignment
                    </div>
                  )}
                  {a.status === "PENDING" && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#F0F4FA] rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: "0%" }} />
                      </div>
                      <span className="text-xs text-[#7A869A]">Not started</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#7A869A] text-sm">No assignments in this category</div>
        )}
      </div>
    </div>
  );
}
