"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CheckCircle, Send, MessageCircle, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

type DoubtRow = {
  id: string;
  content: string;
  answer: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
  subject: { name: string } | null;
  student_record: {
    student: { users: { name: string } | null } | null;
    class: { name: string; section: string } | null;
  } | null;
};

export default function TeacherDoubtsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [doubts, setDoubts] = useState<DoubtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DoubtRow | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "ANSWERED">("ALL");

  useEffect(() => {
    if (!user?.teacherId) return;
    fetchDoubts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.teacherId]);

  const fetchDoubts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("doubts")
      .select(`
        id, content, answer, status, created_at, answered_at,
        subject:subject_id(name),
        student_record:student_records_id(
          student:student_id(users:user_id(name)),
          class:class_id(name, section)
        )
      `)
      .eq("teacher_id", user!.teacherId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load doubts");
      return;
    }
    setDoubts((data as unknown as DoubtRow[]) || []);
    if (data && data.length > 0) setSelected(data[0] as unknown as DoubtRow);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || !selected) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("doubts")
      .update({ answer: answer.trim(), status: "ANSWERED", answered_at: new Date().toISOString() })
      .eq("id", selected.id);
    setSubmitting(false);
    if (error) {
      toast.error("Failed to send answer");
      return;
    }
    const updated = { ...selected, status: "ANSWERED", answer: answer.trim(), answered_at: new Date().toISOString() };
    setDoubts(prev => prev.map(d => d.id === selected.id ? updated : d));
    setSelected(updated);
    setAnswer("");
    toast.success("Answer sent to student!");
  };

  const handleSelect = (d: DoubtRow) => {
    setSelected(d);
    setAnswer("");
  };

  const getStudentName = (d: DoubtRow) =>
    d.student_record?.student?.users?.name || "Unknown Student";

  const getClassName = (d: DoubtRow) => {
    const cls = d.student_record?.class;
    return cls ? `${cls.name} ${cls.section}` : "—";
  };

  const getSubjectName = (d: DoubtRow) => d.subject?.name || "—";

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
  const colorFor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

  const filteredDoubts = doubts.filter(d =>
    filter === "ALL" ? true : d.status === filter
  );
  const openDoubts = doubts.filter(d => d.status === "OPEN");
  const answeredDoubts = doubts.filter(d => d.status === "ANSWERED");

  const displayOpen = filter === "ALL" || filter === "OPEN" ? openDoubts : [];
  const displayAnswered = filter === "ALL" || filter === "ANSWERED" ? answeredDoubts : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Student Doubts</h1>
          <p className="text-sm text-[#7A869A]">{openDoubts.length} pending · {answeredDoubts.length} answered</p>
        </div>
        <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl">
          {(["ALL", "OPEN", "ANSWERED"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: filter === f ? "white" : "transparent", color: filter === f ? "#1A2035" : "#7A869A", boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}
            >
              {f === "ALL" ? "All" : f === "OPEN" ? `Pending (${openDoubts.length})` : `Answered (${answeredDoubts.length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
        </div>
      ) : filteredDoubts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <MessageCircle size={40} className="text-[#E8EDF5] mb-3" />
          <p className="text-sm font-semibold text-[#1A2035]">No doubts yet</p>
          <p className="text-xs text-[#7A869A] mt-1">Students&apos; questions will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-6 min-h-[500px]">
          {/* Doubt list */}
          <div className="col-span-2 space-y-2">
            {displayOpen.length > 0 && (
              <>
                <div className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider px-1 mb-1">PENDING ({displayOpen.length})</div>
                {displayOpen.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleSelect(d)}
                    className="w-full text-left p-4 rounded-2xl border-2 transition-all"
                    style={{ borderColor: selected?.id === d.id ? "#8B5CF6" : "#E8EDF5", background: selected?.id === d.id ? "#F5F3FF" : "white" }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: colorFor(d.id) }}>
                        {getInitials(getStudentName(d))}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#1A2035]">{getStudentName(d)}</div>
                        <div className="text-[10px] text-[#7A869A]">{getClassName(d)} · {getSubjectName(d)}</div>
                      </div>
                      <span className="ml-auto w-2 h-2 rounded-full bg-[#EF4444]" />
                    </div>
                    <div className="text-[11px] text-[#7A869A] line-clamp-2">{d.content}</div>
                  </button>
                ))}
              </>
            )}

            {displayAnswered.length > 0 && (
              <>
                <div className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider px-1 mt-4 mb-1">ANSWERED ({displayAnswered.length})</div>
                {displayAnswered.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleSelect(d)}
                    className="w-full text-left p-4 rounded-2xl border-2 transition-all opacity-70"
                    style={{ borderColor: selected?.id === d.id ? "#10B981" : "#E8EDF5", background: selected?.id === d.id ? "#ECFDF5" : "white" }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: colorFor(d.id) }}>
                        {getInitials(getStudentName(d))}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#1A2035]">{getStudentName(d)}</div>
                        <div className="text-[10px] text-[#7A869A]">{getSubjectName(d)} · {getClassName(d)}</div>
                      </div>
                      <CheckCircle size={14} className="ml-auto text-[#10B981]" />
                    </div>
                    <div className="text-[11px] text-[#7A869A] line-clamp-2">{d.content}</div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Answer panel */}
          <div className="col-span-3 bg-white rounded-2xl border border-[#E8EDF5] flex flex-col">
            {selected ? (
              <>
                {/* Doubt details */}
                <div className="p-5 border-b border-[#E8EDF5]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: colorFor(selected.id) }}>
                      {getInitials(getStudentName(selected))}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#1A2035]">{getStudentName(selected)}</div>
                      <div className="text-xs text-[#7A869A]">{getClassName(selected)} · {getSubjectName(selected)}</div>
                    </div>
                    <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${selected.status === "OPEN" ? "bg-[#FEF2F2] text-[#EF4444]" : "bg-[#ECFDF5] text-[#10B981]"}`}>
                      {selected.status === "OPEN" ? "Pending" : "Answered"}
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl p-4">
                    <div className="text-xs font-semibold text-[#7A869A] mb-1">Student&apos;s Question</div>
                    <div className="text-sm text-[#1A2035]">{selected.content}</div>
                  </div>
                </div>

                {/* Answer section */}
                <div className="flex-1 p-5">
                  {selected.status === "ANSWERED" ? (
                    <div>
                      <div className="text-xs font-semibold text-[#7A869A] mb-2">Your Answer</div>
                      <div className="bg-[#ECFDF5] rounded-xl p-4 text-sm text-[#1A2035] border border-[#A7F3D0]">{selected.answer}</div>
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-[#10B981]">
                        <CheckCircle size={12} /> Answer delivered to student
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-[#1A2035]">Your Answer</div>
                      <textarea
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        rows={5}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#94A3B8]">{answer.length} characters</span>
                        <button
                          onClick={handleSubmit}
                          disabled={!answer.trim() || submitting}
                          className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Send Answer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageCircle size={40} className="text-[#E8EDF5] mb-3" />
                <p className="text-sm text-[#7A869A]">Select a doubt to view and answer</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
