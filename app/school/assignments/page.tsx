"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { MoreHorizontal, Send, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PageHeader } from "@/components/school/PageHeader";
import { StatsCard } from "@/components/school/StatsCard";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";
import { FilterPills } from "@/components/school/FilterPills";
import { SearchInput } from "@/components/school/SearchInput";

interface AssignmentRow {
  id: string;
  title: string;
  status: string;
  duedate: string | null;
  created_at: string;
  classId: string;
  className: string;
  teacherId: string | null;
}

export default function AssignmentsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([]);

  useEffect(() => {
    if (!user?.schoolId) return;
    const supabase = createClient();
    const schoolId = user.schoolId;

    async function fetchAssignments() {
      setLoading(true);
      try {
        // Fetch all classes for this school
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, section")
          .eq("school_id", schoolId)
          .order("name");

        const classRows = classData ?? [];
        setClasses(classRows);

        if (classRows.length === 0) { setLoading(false); return; }

        const classIds = classRows.map((c) => c.id);

        const { data: assignData } = await supabase
          .from("assignment")
          .select("id, title, status, duedate, created_at, class_id, teacher_id")
          .in("class_id", classIds)
          .order("created_at", { ascending: false });

        const rows: AssignmentRow[] = (assignData ?? []).map((a) => {
          const cls = classRows.find((c) => c.id === a.class_id);
          return {
            id: a.id,
            title: a.title,
            status: a.status ?? "ACTIVE",
            duedate: a.duedate,
            created_at: a.created_at,
            classId: a.class_id,
            className: cls ? `${cls.name}-${cls.section}` : "—",
            teacherId: a.teacher_id,
          };
        });
        setAssignments(rows);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [user?.schoolId]);

  const today = new Date().toISOString().split("T")[0];

  const isOverdue = (a: AssignmentRow) => a.status === "ACTIVE" && !!a.duedate && a.duedate < today;

  const filtered = assignments.filter((a) => {
    if (statusFilter === "active" && (a.status !== "ACTIVE" || isOverdue(a))) return false;
    if (statusFilter === "overdue" && !isOverdue(a)) return false;
    if (statusFilter === "closed" && a.status !== "CLOSED") return false;
    if (classFilter !== "all" && a.classId !== classFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const closeAssignment = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("assignment").update({ status: "CLOSED" }).eq("id", id);
    if (error) { toast.error("Failed to close assignment"); return; }
    setAssignments((prev) => prev.map((a) => a.id === id ? { ...a, status: "CLOSED" } : a));
    toast.success("Assignment closed");
  };

  const activeCount = assignments.filter((a) => a.status === "ACTIVE" && !isOverdue(a)).length;
  const overdueCount = assignments.filter((a) => isOverdue(a)).length;
  const closedCount = assignments.filter((a) => a.status === "CLOSED").length;

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Assignments"
        subtitle={`${activeCount} active · ${overdueCount} overdue · ${closedCount} closed`}
        actions={<Button variant="primary" onClick={() => toast("Use teacher dashboard to create assignments")}>+ Create Assignment</Button>}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard label="Active" value={activeCount} icon={<span>📋</span>} bgColor="#ECFDF5" iconColor="#10B981" />
        <StatsCard label="Overdue" value={overdueCount} icon={<AlertTriangle size={18} />} bgColor="#FEF2F2" iconColor="#EF4444" />
        <StatsCard label="Closed" value={closedCount} icon={<span>🔒</span>} bgColor="#F1F5F9" iconColor="#64748B" />
        <StatsCard label="Total" value={assignments.length} icon={<span>📊</span>} bgColor="#EFF6FF" iconColor="#3B82F6" />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <FilterPills
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Overdue", value: "overdue" },
            { label: "Closed", value: "closed" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="text-xs border border-[#E8EDF5] rounded-xl px-3 py-2 bg-white text-[#1A2035] focus:outline-none focus:border-[#FF6B35]"
        >
          <option value="all">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by title..." className="w-56" />
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-sm text-[#7A869A]">
            {assignments.length === 0 ? "No assignments yet" : "No assignments match filters"}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AssignmentCard key={a.id} assignment={a} overdue={isOverdue(a)} onClose={closeAssignment} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({
  assignment: a,
  overdue,
  onClose,
}: {
  assignment: AssignmentRow;
  overdue: boolean;
  onClose: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const borderColor = overdue ? "#EF4444" : a.status === "CLOSED" ? "#94A3B8" : "#10B981";
  const today = new Date().toISOString().split("T")[0];
  const isUrgent = a.duedate === today;

  return (
    <Card className={overdue ? "bg-[#FEF2F2]" : ""}>
      <div className="flex items-center gap-4">
        <div className="w-1 h-16 rounded-full shrink-0" style={{ backgroundColor: borderColor }} />

        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ backgroundColor: borderColor + "20", color: borderColor }}
        >
          A
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[#1A2035]">{a.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF7F4] text-[#FF6B35]">{a.className}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              a.status === "CLOSED" ? "bg-[#F1F5F9] text-[#64748B]" : overdue ? "bg-[#FEF2F2] text-[#EF4444]" : "bg-[#ECFDF5] text-[#10B981]"
            }`}>
              {a.status === "CLOSED" ? "Closed" : overdue ? "Overdue" : "Active"}
            </span>
          </div>
          <div className="text-[11px] text-[#7A869A]">
            Created {new Date(a.created_at).toLocaleDateString("en-IN")}
          </div>
        </div>

        <div className="text-right shrink-0">
          {a.duedate ? (
            overdue ? (
              <span className="text-[10px] font-bold text-[#EF4444] bg-[#FEF2F2] px-2 py-1 rounded-full block mb-1">⚠ OVERDUE</span>
            ) : isUrgent ? (
              <span className="text-[10px] font-bold text-[#F59E0B] bg-[#FFFBEB] px-2 py-1 rounded-full block mb-1">Due Today</span>
            ) : (
              <span className="text-[10px] text-[#7A869A] block mb-1">Due {new Date(a.duedate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            )
          ) : (
            <span className="text-[10px] text-[#7A869A] block mb-1">No due date</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Link href={`/school/assignments/${a.id}`}>
            <Button size="sm" variant="ghost">View Results</Button>
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F0F4FA] text-[#7A869A]"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-[#E8EDF5] shadow-lg z-20">
                  <button className="w-full text-left px-4 py-2.5 text-xs text-[#1A2035] hover:bg-[#F0F4FA] flex items-center gap-2" onClick={() => { toast.success("Reminder sent"); setShowMenu(false); }}>
                    <Send size={12} /> Send Reminder
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-xs text-[#1A2035] hover:bg-[#F0F4FA]" onClick={() => { toast.success("Deadline extended"); setShowMenu(false); }}>
                    <Clock size={12} className="inline mr-2" /> Extend Deadline
                  </button>
                  {a.status !== "CLOSED" && (
                    <button className="w-full text-left px-4 py-2.5 text-xs text-[#1A2035] hover:bg-[#F0F4FA]" onClick={() => { onClose(a.id); setShowMenu(false); }}>
                      Close Assignment
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {overdue && (
        <div className="mt-3 pt-3 border-t border-[#EF4444]/20 flex items-center justify-between">
          <span className="text-xs text-[#EF4444]">⚠ OVERDUE</span>
          <Button size="sm" variant="danger" onClick={() => toast.success("Reminder sent")}>
            Send Reminder
          </Button>
        </div>
      )}
    </Card>
  );
}
