"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Search, ClipboardList, AlertCircle, Zap, CheckCircle } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "#DCFCE7", color: "#166534", label: "Active" },
  COMPLETED: { bg: "#F0F4FA", color: "#7A869A", label: "Completed" },
  OVERDUE: { bg: "#FEE2E2", color: "#991B1B", label: "Overdue" },
};

type AssignmentRow = {
  id: string;
  title: string;
  className: string;
  section: string;
  duedate: string;
  status: string;
  questionCount: number;
};

export default function TeacherAssignmentsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (!user?.teacherId) return;
    const supabase = createClient();
    const teacherId = user.teacherId;

    async function fetchAssignments() {
      setLoading(true);
      const { data } = await supabase
        .from("assignment")
        .select("id, title, duedate, status, classes(name, section), quiz(count)")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const rows: AssignmentRow[] = data.map(a => {
        const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes as { name?: string; section?: string } | null;
        const quiz = Array.isArray(a.quiz) ? a.quiz[0] : a.quiz as { count?: number } | null;
        return {
          id: a.id,
          title: a.title,
          className: cls?.name ?? "",
          section: cls?.section ?? "",
          duedate: a.duedate,
          status: a.status ?? "ACTIVE",
          questionCount: quiz?.count ?? 0,
        };
      });
      setAssignments(rows);
      setLoading(false);
    }

    fetchAssignments();
  }, [user?.teacherId]);

  const filtered = assignments.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.className.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "ALL" ||
      (filter === "ACTIVE" && a.status === "ACTIVE") ||
      (filter === "COMPLETED" && a.status === "COMPLETED") ||
      (filter === "OVERDUE" && a.status === "OVERDUE");
    return matchSearch && matchFilter;
  });

  const activeCount = assignments.filter(a => a.status === "ACTIVE").length;
  const overdueCount = assignments.filter(a => a.status === "OVERDUE").length;

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Assignments</h1>
          <p className="text-sm text-[#7A869A]">{activeCount} active · {overdueCount} overdue</p>
        </div>
        <Link href="/teacher/assignments/new" className="flex items-center gap-2 bg-[#8B5CF6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors">
          <Plus size={16} /> New Assignment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-[#E8EDF5] flex-1 max-w-xs">
          <Search size={14} className="text-[#7A869A]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments..." className="bg-transparent text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none flex-1" />
        </div>
        <div className="flex gap-2">
          {["ALL", "ACTIVE", "COMPLETED", "OVERDUE"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: filter === f ? "#8B5CF6" : "#F0F4FA", color: filter === f ? "white" : "#7A869A" }}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments table */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 bg-[#F8FAFC] text-[10px] font-semibold text-[#7A869A] uppercase tracking-wider border-b border-[#E8EDF5]">
          <div className="col-span-5">Assignment</div>
          <div className="col-span-3">Class</div>
          <div className="col-span-1 text-center">Qs</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-[#F0F4FA]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#7A869A]">
              <ClipboardList size={32} className="text-[#E8EDF5] mx-auto mb-3" />
              {assignments.length === 0 ? "No assignments yet. Create your first one!" : "No assignments match your search."}
            </div>
          ) : filtered.map(a => {
            const isOverdue = a.status === "OVERDUE";
            const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.ACTIVE;
            return (
              <div key={a.id} className="grid grid-cols-12 px-5 py-4 items-center hover:bg-[#F8FAFC] transition-colors">
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    {isOverdue && <AlertCircle size={12} className="text-[#EF4444] shrink-0" />}
                    <div>
                      <div className="text-xs font-semibold text-[#1A2035]">{a.title}</div>
                      <div className="text-[10px] text-[#7A869A] mt-0.5">
                        Due {a.duedate ? new Date(a.duedate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="text-xs text-[#1A2035]">{a.className}{a.section ? ` - ${a.section}` : ""}</div>
                </div>
                <div className="col-span-1 text-center text-xs text-[#1A2035]">{a.questionCount}</div>
                <div className="col-span-1 text-center">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>
                    {style.label}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Link href={`/teacher/reports`} className="px-2 py-1 text-[10px] font-semibold text-[#8B5CF6] bg-[#F5F3FF] rounded-lg hover:bg-[#EDE9FE] transition-colors">View</Link>
                  <button onClick={() => toast(`Reminding students for ${a.title}`)} className="px-2 py-1 text-[10px] font-semibold text-[#FF6B35] bg-[#FFF7F4] rounded-lg hover:bg-[#FFE9DC] transition-colors">Remind</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
