"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Send, CheckCircle, HelpCircle } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

interface ClassSubjectOption {
  classSubjectId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
}

interface Doubt {
  id: string;
  content: string;
  answer: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
  subject: { name: string } | null;
  teacher: { users: { name: string } | { name: string }[] } | null;
}

export default function StudentDoubtsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectOption[]>([]);
  const [loadingDoubts, setLoadingDoubts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState(0);
  const [content, setContent] = useState("");

  const fetchDoubts = async () => {
    if (!user?.studentRecordId) return;
    const { data, error } = await supabase
      .from("doubts")
      .select("id, content, answer, status, created_at, answered_at, subject:subject_id(name), teacher:teacher_id(users:user_id(name))")
      .eq("student_records_id", user.studentRecordId)
      .order("created_at", { ascending: false });

    if (!error && data) setDoubts(data as unknown as Doubt[]);
    setLoadingDoubts(false);
  };

  useEffect(() => {
    if (!user?.classId || !user?.studentRecordId) return;

    const fetchClassSubjects = async () => {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("id, subject:subject_id(id, name), teacher:teacher_id(id, users:user_id(name))")
        .eq("class_id", user.classId);

      if (!error && data) {
        const options: ClassSubjectOption[] = (data as any[]).map(cs => {
          const teacherUser = cs.teacher?.users;
          const teacherName = Array.isArray(teacherUser)
            ? teacherUser[0]?.name ?? "—"
            : teacherUser?.name ?? "—";
          return {
            classSubjectId: cs.id,
            subjectId: cs.subject?.id ?? "",
            subjectName: cs.subject?.name ?? "Unknown",
            teacherId: cs.teacher?.id ?? "",
            teacherName,
          };
        });
        setClassSubjects(options);
      }
    };

    fetchClassSubjects();
    fetchDoubts();
  }, [user?.classId, user?.studentRecordId]);

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error("Please describe your doubt"); return; }
    if (classSubjects.length === 0) { toast.error("No subjects available"); return; }
    if (!user?.studentRecordId) return;

    const chosen = classSubjects[selectedSubjectIdx];
    setSubmitting(true);

    const { error } = await supabase.from("doubts").insert({
      student_records_id: user.studentRecordId,
      subject_id: chosen.subjectId || null,
      teacher_id: chosen.teacherId || null,
      content: content.trim(),
      status: "OPEN",
    });

    setSubmitting(false);

    if (error) { toast.error("Failed to submit doubt"); return; }
    toast.success("Doubt submitted! Your teacher will answer soon.");
    setContent("");
    fetchDoubts();
  };

  const getTeacherName = (doubt: Doubt) => {
    if (!doubt.teacher) return "—";
    const u = doubt.teacher.users;
    if (Array.isArray(u)) return u[0]?.name ?? "—";
    return u?.name ?? "—";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Ask a Doubt</h1>
        <p className="text-sm text-[#7A869A]">Your teacher will answer within 24 hours</p>
      </div>

      {/* Submit form */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <h2 className="text-sm font-semibold text-[#1A2035] mb-4">New Question</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Subject &amp; Teacher</label>
            {classSubjects.length === 0 ? (
              <div className="text-sm text-[#CBD5E1] px-4 py-2">Loading subjects...</div>
            ) : (
              <select
                value={selectedSubjectIdx}
                onChange={e => setSelectedSubjectIdx(Number(e.target.value))}
                className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none"
              >
                {classSubjects.map((cs, idx) => (
                  <option key={cs.classSubjectId} value={idx}>
                    {cs.subjectName} — {cs.teacherName}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Your Question</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              placeholder="Describe your doubt in detail..."
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#FF6B35]/30 resize-none"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55A28] transition-colors disabled:opacity-60"
          >
            <Send size={14} /> {submitting ? "Submitting..." : "Submit Question"}
          </button>
        </div>
      </div>

      {/* Previous doubts */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#1A2035]">My Questions</h2>

        {loadingDoubts ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : doubts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-[#E8EDF5] text-center">
            <HelpCircle size={36} className="text-[#CBD5E1] mx-auto mb-3" />
            <div className="text-sm text-[#7A869A]">No doubts submitted yet</div>
          </div>
        ) : (
          doubts.map(d => (
            <div key={d.id} className="bg-white rounded-2xl p-5 border border-[#E8EDF5]">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${d.status === "ANSWERED" ? "bg-[#ECFDF5]" : "bg-[#FFFBEB]"}`}>
                  {d.status === "ANSWERED"
                    ? <CheckCircle size={16} className="text-[#10B981]" />
                    : <HelpCircle size={16} className="text-[#F59E0B]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#1A2035]">
                      {d.subject?.name ?? "General"}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === "ANSWERED" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FFFBEB] text-[#F59E0B]"}`}>
                      {d.status === "ANSWERED" ? "Answered" : "Pending"}
                    </span>
                  </div>
                  <div className="text-sm text-[#1A2035] mb-3">{d.content}</div>
                  {d.status === "ANSWERED" && d.answer && (
                    <div className="bg-[#ECFDF5] rounded-xl p-3 border border-[#A7F3D0]">
                      <div className="text-[10px] font-semibold text-[#10B981] mb-1">
                        {getTeacherName(d)} answered:
                      </div>
                      <div className="text-sm text-[#1A2035]">{d.answer}</div>
                    </div>
                  )}
                  <div className="text-[10px] text-[#CBD5E1] mt-2">
                    {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
