"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft, Search, CheckCircle, BookOpen, Zap, Trophy,
  Users, ChevronRight, Plus, Upload, Link2, X, FileText, Video, Layers,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "HOMEWORK" | "GAME" | "COMPETITION";
type Step = 1 | 2 | 3 | 4;

const MODE_OPTIONS: { id: Mode; icon: React.ReactNode; label: string; desc: string; color: string }[] = [
  { id: "HOMEWORK",    icon: <BookOpen size={20} />, label: "Homework",    desc: "Standard quiz assigned as homework with deadline", color: "#8B5CF6" },
  { id: "GAME",        icon: <Zap size={20} />,      label: "Game Mode",   desc: "Gamified battle — students compete in real time",   color: "#FF6B35" },
  { id: "COMPETITION", icon: <Trophy size={20} />,   label: "Competition", desc: "Class-wide tournament with leaderboard & prizes",   color: "#FFB347" },
];

const STEPS = ["Mode & Quiz", "Classes", "Settings", "Review"];

type QuizRow = { id: string; title: string; topic: string; count: number; time: number; difficulty: string };
type ClassRow = { id: string; name: string; section: string; studentCount: number; color: string };

const CLASS_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#FF6B35", "#F59E0B", "#EF4444"];

export default function NewAssignmentPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("HOMEWORK");
  const [selectedQuiz, setSelectedQuiz] = useState<QuizRow | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [xpReward, setXpReward] = useState(50);
  const [quizSearch, setQuizSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.teacherId) return;
    const supabase = createClient();
    const teacherId = user.teacherId;

    async function fetchOptions() {
      setLoading(true);
      const [{ data: quizData }, { data: classSubjectData }] = await Promise.all([
        supabase
          .from("quiz")
          .select("id, title, topic, count, time, difficulty")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false }),
        supabase
          .from("class_subjects")
          .select("class_id, classes(id, name, section)")
          .eq("teacher_id", teacherId),
      ]);

      if (quizData) {
        setQuizzes(quizData.map(q => ({
          id: q.id,
          title: q.title,
          topic: q.topic ?? "",
          count: q.count ?? 0,
          time: q.time ?? 15,
          difficulty: q.difficulty ?? "MEDIUM",
        })));
      }

      if (classSubjectData) {
        const seen = new Set<string>();
        const rows: ClassRow[] = [];
        let colorIdx = 0;
        for (const cs of classSubjectData) {
          const cls = Array.isArray(cs.classes) ? cs.classes[0] : cs.classes as { id?: string; name?: string; section?: string } | null;
          if (!cls?.id || seen.has(cls.id)) continue;
          seen.add(cls.id);
          const { count } = await supabase
            .from("student_records")
            .select("id", { count: "exact", head: true })
            .eq("class_id", cls.id)
            .eq("is_current", true);
          rows.push({
            id: cls.id,
            name: cls.name ?? "",
            section: cls.section ?? "",
            studentCount: count ?? 0,
            color: CLASS_COLORS[colorIdx++ % CLASS_COLORS.length],
          });
        }
        setClasses(rows);
      }

      setLoading(false);
    }

    fetchOptions();
  }, [user?.teacherId]);

  const toggleClass = (id: string) =>
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const selectedStudentCount = classes
    .filter(c => selectedClasses.includes(c.id))
    .reduce((sum, c) => sum + c.studentCount, 0);

  const filteredQuizzes = quizzes.filter(q =>
    q.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
    q.topic.toLowerCase().includes(quizSearch.toLowerCase())
  );

  async function handlePublish() {
    if (!selectedQuiz || selectedClasses.length === 0 || !dueDate) {
      toast.error("Please complete all required fields");
      return;
    }
    if (!user?.teacherId) return;

    setSubmitting(true);
    const supabase = createClient();
    const duedatetime = `${dueDate}T${dueTime}:00`;

    const inserts = selectedClasses.map(classId => ({
      quiz_id: selectedQuiz.id,
      class_id: classId,
      teacher_id: user.teacherId,
      title: selectedQuiz.title,
      duedate: duedatetime,
      status: "ACTIVE",
    }));

    const { error } = await supabase.from("assignment").insert(inserts);
    setSubmitting(false);

    if (error) {
      toast.error("Failed to create assignment: " + error.message);
    } else {
      toast.success(`Assignment published to ${selectedClasses.length} class${selectedClasses.length > 1 ? "es" : ""}!`);
      router.push("/teacher/assignments");
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/teacher/assignments" className="text-[#7A869A] hover:text-[#1A2035] transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">New Assignment</h1>
          <p className="text-sm text-[#7A869A]">Step {step} of {STEPS.length}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{ background: step > i + 1 ? "#10B981" : step === i + 1 ? "#8B5CF6" : "#F0F4FA", color: step >= i + 1 ? "white" : "#7A869A" }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: step === i + 1 ? "#8B5CF6" : "#7A869A" }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-[#E8EDF5]" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Mode & Quiz */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
            <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Assignment Mode</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODE_OPTIONS.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className="p-4 rounded-xl border-2 text-left transition-all"
                  style={{ borderColor: mode === m.id ? m.color : "#E8EDF5", background: mode === m.id ? m.color + "10" : "white" }}>
                  <div className="mb-2" style={{ color: m.color }}>{m.icon}</div>
                  <div className="text-sm font-bold text-[#1A2035] mb-1">{m.label}</div>
                  <div className="text-[11px] text-[#7A869A]">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
            <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Select Quiz</h2>
            <div className="flex items-center gap-2 mb-4 bg-[#F8FAFC] rounded-xl px-3 h-10 border border-[#E8EDF5]">
              <Search size={14} className="text-[#7A869A]" />
              <input value={quizSearch} onChange={e => setQuizSearch(e.target.value)} placeholder="Search quiz library..." className="bg-transparent text-sm outline-none flex-1 text-[#1A2035] placeholder-[#94A3B8]" />
            </div>
            {filteredQuizzes.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen size={32} className="text-[#E8EDF5] mx-auto mb-2" />
                <p className="text-sm text-[#7A869A]">No quizzes found. <Link href="/teacher/quizzes" className="text-[#8B5CF6] hover:underline">Create a quiz first.</Link></p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredQuizzes.map(q => (
                  <button key={q.id} onClick={() => setSelectedQuiz(q)}
                    className="w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4"
                    style={{ borderColor: selectedQuiz?.id === q.id ? "#8B5CF6" : "#E8EDF5", background: selectedQuiz?.id === q.id ? "#F5F3FF" : "#F8FAFC" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#1A2035] mb-0.5">{q.title}</div>
                      <div className="text-[11px] text-[#7A869A]">{q.topic} · {q.count} questions · {q.time}min · {q.difficulty}</div>
                    </div>
                    {selectedQuiz?.id === q.id && <CheckCircle size={16} className="text-[#8B5CF6]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => { if (!selectedQuiz) { toast.error("Select a quiz first"); return; } setStep(2); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors">
              Next: Choose Classes <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Classes */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
            <h2 className="text-sm font-semibold text-[#1A2035] mb-1">Assign to Classes</h2>
            <p className="text-xs text-[#7A869A] mb-4">Select one or more of your classes</p>
            {classes.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#7A869A]">No classes assigned. Contact school admin.</div>
            ) : (
              <div className="space-y-3">
                {classes.map(c => (
                  <button key={c.id} onClick={() => toggleClass(c.id)}
                    className="w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all"
                    style={{ borderColor: selectedClasses.includes(c.id) ? c.color : "#E8EDF5", background: selectedClasses.includes(c.id) ? c.color + "10" : "#F8FAFC" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: c.color }}>
                      {c.name.replace(/grade\s*/i, "")}{c.section ? `-${c.section}` : ""}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#1A2035]">{c.name}{c.section ? ` - ${c.section}` : ""}</div>
                      <div className="text-[11px] text-[#7A869A]">{c.studentCount} students</div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{ borderColor: selectedClasses.includes(c.id) ? c.color : "#E8EDF5", background: selectedClasses.includes(c.id) ? c.color : "white" }}>
                      {selectedClasses.includes(c.id) && <CheckCircle size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedClasses.length > 0 && (
              <div className="mt-4 p-3 bg-[#F5F3FF] rounded-xl flex items-center gap-2">
                <Users size={14} className="text-[#8B5CF6]" />
                <span className="text-xs text-[#8B5CF6] font-medium">{selectedStudentCount} students will receive this assignment</span>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-[#E8EDF5] rounded-xl text-sm text-[#7A869A] hover:bg-[#F0F4FA] transition-colors">← Back</button>
            <button onClick={() => { if (selectedClasses.length === 0) { toast.error("Select at least one class"); return; } setStep(3); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors">
              Next: Settings <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
            <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Assignment Settings</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Due Time</label>
                  <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">
                  XP Reward — <span className="text-[#8B5CF6]">{xpReward} XP</span>
                </label>
                <input type="range" min={10} max={200} step={10} value={xpReward} onChange={e => setXpReward(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6]" />
                <div className="flex justify-between text-[10px] text-[#7A869A] mt-1"><span>10 XP</span><span>200 XP</span></div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Instructions (optional)</label>
                <textarea rows={3} placeholder="Add any instructions for students…"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 resize-none" />
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 border border-[#E8EDF5] rounded-xl text-sm text-[#7A869A] hover:bg-[#F0F4FA] transition-colors">← Back</button>
            <button onClick={() => { if (!dueDate) { toast.error("Please set a due date"); return; } setStep(4); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors">
              Review & Publish <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && selectedQuiz && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5] space-y-4">
            <h2 className="text-sm font-semibold text-[#1A2035]">Review Assignment</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8FAFC] rounded-xl">
                <div className="text-[11px] text-[#7A869A] mb-1">Quiz</div>
                <div className="text-sm font-semibold text-[#1A2035]">{selectedQuiz.title}</div>
                <div className="text-[11px] text-[#7A869A]">{selectedQuiz.count}Q · {selectedQuiz.time}min</div>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl">
                <div className="text-[11px] text-[#7A869A] mb-1">Mode</div>
                <div className="text-sm font-semibold text-[#1A2035]">{mode.charAt(0) + mode.slice(1).toLowerCase()}</div>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl">
                <div className="text-[11px] text-[#7A869A] mb-1">Classes · Students</div>
                <div className="text-sm font-semibold text-[#1A2035]">{selectedClasses.length} class{selectedClasses.length > 1 ? "es" : ""}</div>
                <div className="text-[11px] text-[#7A869A]">{selectedStudentCount} students</div>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl">
                <div className="text-[11px] text-[#7A869A] mb-1">Due</div>
                <div className="text-sm font-semibold text-[#1A2035]">
                  {dueDate ? new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </div>
                <div className="text-[11px] text-[#7A869A]">at {dueTime}</div>
              </div>
            </div>
            <div className="p-3 bg-[#F5F3FF] rounded-xl text-xs text-[#8B5CF6]">
              Students earn +{xpReward} XP on completion
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="px-4 py-2 border border-[#E8EDF5] rounded-xl text-sm text-[#7A869A] hover:bg-[#F0F4FA] transition-colors">← Back</button>
            <div className="flex gap-3">
              <button onClick={() => toast("Assignment saved as draft")}
                className="px-4 py-2 border border-[#E8EDF5] rounded-xl text-sm font-medium text-[#7A869A] hover:bg-[#F0F4FA] transition-colors">
                Save Draft
              </button>
              <button onClick={handlePublish} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Zap size={16} /> {submitting ? "Publishing..." : "Publish Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
