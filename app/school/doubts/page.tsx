"use client";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/school/PageHeader";
import { Card } from "@/components/school/Card";
import { FilterPills } from "@/components/school/FilterPills";
import { SearchInput } from "@/components/school/SearchInput";
import { DoubtCard } from "@/components/school/DoubtCard";

const STUDENT_COLORS = ["#FF6B35", "#8B5CF6", "#10B981", "#3B82F6", "#EF4444"];

interface DoubtItem {
  id: string;
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentColor: string;
  className: string;
  teacherName: string;
  subject: string;
  topic: string;
  content: string;
  answer: string | null;
  status: string;
  createdAt: string;
  answeredAt: string | null;
}

export default function DoubtsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [loadingDoubts, setLoadingDoubts] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.schoolId) return;

    async function fetchDoubts() {
      setLoadingDoubts(true);
      const supabase = createClient();

      // Get all student_records for this school
      const { data: records, error: recErr } = await supabase
        .from("student_records")
        .select("id")
        .eq("school_id", user!.schoolId!);

      if (recErr || !records || records.length === 0) {
        setDoubts([]);
        setLoadingDoubts(false);
        return;
      }

      const recordIds = records.map((r) => r.id);

      // Fetch doubts with nested joins
      const { data: rawDoubts, error: doubtErr } = await supabase
        .from("doubts")
        .select(`
          id, content, answer, status, created_at, answered_at,
          subjects:subject_id ( name ),
          student_record:student_records_id (
            id,
            classes:class_id ( name, section ),
            student:student_id (
              user_id,
              users:user_id ( id, name )
            )
          ),
          teacher:teacher_id (
            user:user_id ( name )
          )
        `)
        .in("student_records_id", recordIds)
        .order("created_at", { ascending: false });

      if (doubtErr || !rawDoubts) {
        setDoubts([]);
        setLoadingDoubts(false);
        return;
      }

      const mapped: DoubtItem[] = rawDoubts.map((d: any, i: number) => {
        const studentRecord = Array.isArray(d.student_record) ? d.student_record[0] : d.student_record;
        const student = studentRecord?.student ? (Array.isArray(studentRecord.student) ? studentRecord.student[0] : studentRecord.student) : null;
        const userObj = student?.users ? (Array.isArray(student.users) ? student.users[0] : student.users) : null;
        const cls = studentRecord?.classes ? (Array.isArray(studentRecord.classes) ? studentRecord.classes[0] : studentRecord.classes) : null;
        const subjectObj = d.subjects ? (Array.isArray(d.subjects) ? d.subjects[0] : d.subjects) : null;
        const teacherObj = d.teacher ? (Array.isArray(d.teacher) ? d.teacher[0] : d.teacher) : null;
        const teacherUser = teacherObj?.user ? (Array.isArray(teacherObj.user) ? teacherObj.user[0] : teacherObj.user) : null;

        const studentName = userObj?.name ?? "Unknown Student";
        const initials = studentName.slice(0, 2).toUpperCase();

        return {
          id: d.id,
          studentId: userObj?.id ?? "",
          studentName,
          studentInitials: initials,
          studentColor: STUDENT_COLORS[i % STUDENT_COLORS.length],
          className: cls ? `${cls.name}-${cls.section}` : "",
          teacherName: teacherUser?.name ?? "Unknown Teacher",
          subject: subjectObj?.name ?? "",
          topic: "",
          content: d.content ?? "",
          answer: d.answer ?? null,
          status: d.status ?? "OPEN",
          createdAt: d.created_at ?? "",
          answeredAt: d.answered_at ?? null,
        };
      });

      setDoubts(mapped);
      setLoadingDoubts(false);
    }

    fetchDoubts();
  }, [user?.schoolId]);

  const isLoading = userLoading || loadingDoubts;

  const subjects = [...new Set(doubts.map((d) => d.subject).filter(Boolean))];

  const filtered = doubts.filter((d) => {
    if (statusFilter === "open" && d.status !== "OPEN") return false;
    if (statusFilter === "answered" && d.status !== "ANSWERED") return false;
    if (subjectFilter !== "all" && d.subject !== subjectFilter) return false;
    if (search && !d.content.toLowerCase().includes(search.toLowerCase()) && !d.studentName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCount = doubts.filter((d) => d.status === "OPEN").length;
  const answeredCount = doubts.filter((d) => d.status === "ANSWERED").length;

  const statusOptions = [
    { label: "All", value: "all", count: doubts.length },
    { label: "Open", value: "open", count: openCount },
    { label: "Answered", value: "answered", count: answeredCount },
  ];

  const mostAskedSubject = subjects.length > 0
    ? subjects.reduce((a, b) => doubts.filter((d) => d.subject === a).length >= doubts.filter((d) => d.subject === b).length ? a : b)
    : null;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Student Doubts"
        subtitle={`${openCount} pending · ${answeredCount} answered`}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#1A2035]">{isLoading ? "—" : doubts.length}</div>
          <div className="text-xs text-[#7A869A]">Total Doubts</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#F59E0B]">{isLoading ? "—" : openCount}</div>
          <div className="text-xs text-[#7A869A]">Unanswered</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#10B981]">{isLoading ? "—" : answeredCount}</div>
          <div className="text-xs text-[#7A869A]">Answered</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#3B82F6]">
            {isLoading ? "—" : answeredCount > 0
              ? `${Math.round((answeredCount / doubts.length) * 100)}%`
              : "0%"}
          </div>
          <div className="text-xs text-[#7A869A]">Response Rate</div>
        </Card>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <FilterPills options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="text-xs border border-[#E8EDF5] rounded-xl px-3 py-2 bg-white text-[#1A2035] focus:outline-none focus:border-[#FF6B35]"
        >
          <option value="all">All Subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search doubts..." className="w-56" />
        {mostAskedSubject && (
          <div className="ml-auto text-xs text-[#7A869A]">
            Most asked: <span className="font-medium text-[#1A2035]">{mostAskedSubject}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((doubt) => (
            <DoubtCard key={doubt.id} doubt={doubt} />
          ))}
          {filtered.length === 0 && (
            <Card className="text-center py-12">
              <div className="text-4xl mb-2">🤔</div>
              <div className="text-sm text-[#7A869A]">
                {doubts.length === 0 ? "No doubts submitted yet" : "No doubts match your filters"}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
