"use client";
import React, { useState, useEffect } from "react";
import {
  Target, Star, Clock, BookOpen, Filter, Search, X,
  ChevronDown, Lock, Play, CheckCircle, Loader2, Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface Test {
  id: string; title: string; exam_type: string; subject: string;
  difficulty: string; question_count: number; duration_minutes: number;
  credit_cost: number; is_free: boolean;
}
interface Attempt {
  test_id: string; status: string; percentage: number | null;
}
interface Profile { id: string; credit_balance: number; }

const EXAM_TYPES = ["ALL","SSC","RRB","UPSC","BANK_PO","NDA","CTET","STATE_PSC","GENERAL"];
const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: "#DCFCE7", color: "#166534" },
  MEDIUM: { bg: "#FEF9C3", color: "#854D0E" },
  HARD:   { bg: "#FEE2E2", color: "#991B1B" },
};
const EXAM_COLORS: Record<string, string> = {
  SSC:"#3B82F6", UPSC:"#8B5CF6", RRB:"#10B981", BANK_PO:"#F59E0B",
  NDA:"#FF6B35", CTET:"#EF4444", STATE_PSC:"#22C55E", GENERAL:"#7A869A",
};

function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-9 pl-3 pr-7 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] outline-none appearance-none focus:border-[#F59E0B]">
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
    </div>
  );
}

export default function AspirantTestsPage() {
  const [tests,     setTests]     = useState<Test[]>([]);
  const [attempts,  setAttempts]  = useState<Attempt[]>([]);
  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [starting,  setStarting]  = useState<string | null>(null);
  const [examFilter, setExamFilter] = useState("ALL");
  const [diffFilter, setDiffFilter] = useState("ALL");
  const [freeOnly,  setFreeOnly]  = useState(false);
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: prof } = await supabase.from("aspirant_profiles")
        .select("id, credit_balance").eq("user_id", user.id).single();
      setProfile(prof as Profile ?? null);

      const [{ data: testData }, { data: attData }] = await Promise.all([
        supabase.from("aspirant_tests").select("*").order("created_at", { ascending: false }),
        prof ? supabase.from("aspirant_test_attempts")
          .select("test_id, status, percentage").eq("aspirant_id", prof.id) : { data: [] },
      ]);
      setTests((testData ?? []) as Test[]);
      setAttempts((attData ?? []) as Attempt[]);
      setLoading(false);
    });
  }, []);

  const attemptMap = new Map(attempts.map(a => [a.test_id, a]));

  async function handleStart(test: Test) {
    if (!profile) { toast.error("Please complete your profile first"); return; }
    if (!test.is_free && test.credit_cost > 0) {
      if (profile.credit_balance < test.credit_cost) {
        toast.error(`You need ${test.credit_cost} credits. Upload resources to earn more!`);
        return;
      }
      const confirm = window.confirm(`This test costs ${test.credit_cost} credits. Continue?`);
      if (!confirm) return;
    }
    setStarting(test.id);
    const supabase = createClient();
    // Deduct credits if needed
    if (!test.is_free && test.credit_cost > 0) {
      await supabase.from("aspirant_profiles")
        .update({ credit_balance: profile.credit_balance - test.credit_cost })
        .eq("id", profile.id);
      await supabase.from("credit_transactions").insert({
        aspirant_id: profile.id, amount: -test.credit_cost, type: "TEST_PURCHASE",
        description: `Unlocked: ${test.title}`, reference_id: test.id,
      });
      setProfile(p => p ? { ...p, credit_balance: p.credit_balance - test.credit_cost } : p);
    }
    // Create attempt record
    const { data: att } = await supabase.from("aspirant_test_attempts").insert({
      aspirant_id: profile.id, test_id: test.id, status: "IN_PROGRESS",
    }).select().single();
    setStarting(null);
    if (att) {
      toast.success(`Test started! (${test.question_count} questions · ${test.duration_minutes} min)`);
      setAttempts(prev => [...prev, { test_id: test.id, status: "IN_PROGRESS", percentage: null }]);
    }
  }

  const filtered = tests.filter(t => {
    if (examFilter !== "ALL" && t.exam_type !== examFilter) return false;
    if (diffFilter !== "ALL" && t.difficulty !== diffFilter) return false;
    if (freeOnly && !t.is_free) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.title.toLowerCase().includes(s) || t.subject.toLowerCase().includes(s);
    }
    return true;
  });

  const freeCount   = tests.filter(t => t.is_free).length;
  const totalDone   = attempts.filter(a => a.status === "COMPLETED").length;
  const avgPct      = attempts.filter(a => a.percentage !== null).length > 0
    ? Math.round(attempts.filter(a => a.percentage !== null).reduce((s, a) => s + (a.percentage ?? 0), 0) / attempts.filter(a => a.percentage !== null).length)
    : null;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Practice Tests</h1>
        <p className="text-sm text-[#7A869A]">Prepare for SSC, RRB, UPSC, Bank PO and more</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Free Tests",   value: freeCount,                                icon: <Play size={16}/>,      color:"#10B981", bg:"#ECFDF5" },
          { label: "Completed",    value: totalDone,                                icon: <CheckCircle size={16}/>,color:"#8B5CF6", bg:"#F5F3FF" },
          { label: "Avg Score",    value: avgPct !== null ? `${avgPct}%` : "—",    icon: <Trophy size={16}/>,     color:"#F59E0B", bg:"#FFFBEB" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#E8EDF5]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="text-xl font-bold text-[#1A2035]">{s.value}</div>
            <div className="text-xs text-[#7A869A]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Credits balance */}
      {profile && (
        <div className="flex items-center gap-3 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl">
          <Star size={18} className="text-[#F59E0B] shrink-0"/>
          <p className="text-sm text-[#92400E]">
            You have <strong>{profile.credit_balance} credits</strong>. Free tests are always available.
            Paid tests unlock premium content.
          </p>
        </div>
      )}

      {/* Exam type filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {EXAM_TYPES.map(e => (
          <button key={e} onClick={() => setExamFilter(e)}
            className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0"
            style={{
              background: examFilter === e ? (EXAM_COLORS[e] ?? "#F59E0B") : "#F0F4FA",
              color: examFilter === e ? "white" : "#7A869A",
            }}>
            {e === "ALL" ? "All Exams" : e.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8EDF5] flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A869A]"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests…"
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:border-[#F59E0B]"/>
        </div>
        <Sel value={diffFilter} onChange={setDiffFilter}>
          <option value="ALL">All Levels</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </Sel>
        <button onClick={() => setFreeOnly(f => !f)}
          className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-colors ${freeOnly ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#10B981]" : "bg-white border-[#E8EDF5] text-[#7A869A]"}`}>
          <Play size={11}/> Free Only
        </button>
        {(search || diffFilter !== "ALL" || freeOnly) && (
          <button onClick={() => { setSearch(""); setDiffFilter("ALL"); setFreeOnly(false); }}
            className="flex items-center gap-1 h-9 px-3 rounded-xl border border-dashed border-[#E8EDF5] text-xs text-[#7A869A] hover:text-[#EF4444] hover:border-[#EF4444] transition-colors">
            <X size={11}/> Reset
          </button>
        )}
        <span className="ml-auto text-xs text-[#7A869A] flex items-center gap-1">
          <Filter size={11}/> {filtered.length} tests
        </span>
      </div>

      {/* Tests grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E8EDF5] p-5 animate-pulse">
              <div className="h-4 bg-[#F0F4FA] rounded w-1/3 mb-3"/>
              <div className="h-5 bg-[#F0F4FA] rounded w-3/4 mb-2"/>
              <div className="h-3 bg-[#F8FAFC] rounded w-1/2 mb-4"/>
              <div className="flex gap-2">
                <div className="h-6 bg-[#F0F4FA] rounded-full w-16"/>
                <div className="h-6 bg-[#F0F4FA] rounded-full w-16"/>
              </div>
              <div className="h-9 bg-[#F0F4FA] rounded-xl mt-4"/>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
          <Target size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
          <p className="text-sm font-semibold text-[#1A2035]">No tests found</p>
          <p className="text-xs text-[#7A869A] mt-1">Try changing the filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(test => {
            const att = attemptMap.get(test.id);
            const ds = DIFF_STYLE[test.difficulty] ?? DIFF_STYLE.MEDIUM;
            const ec = EXAM_COLORS[test.exam_type] ?? "#7A869A";
            const canAfford = profile ? (test.is_free || profile.credit_balance >= test.credit_cost) : false;
            const isStarting = starting === test.id;

            return (
              <div key={test.id} className="bg-white rounded-2xl border border-[#E8EDF5] p-5 hover:shadow-md transition-all flex flex-col">
                {/* Top badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: ec }}>{test.exam_type.replace("_"," ")}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={ds}>{test.difficulty}</span>
                  {test.is_free
                    ? <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981]">FREE</span>
                    : <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] flex items-center gap-1">
                        <Star size={8}/> {test.credit_cost}
                      </span>
                  }
                </div>

                <h3 className="text-sm font-bold text-[#1A2035] mb-1 leading-snug">{test.title}</h3>
                <p className="text-[10px] text-[#7A869A] mb-3">{test.subject}</p>

                {/* Meta */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center gap-1 text-[10px] text-[#7A869A]">
                    <BookOpen size={10}/> {test.question_count} Qs
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[#7A869A]">
                    <Clock size={10}/> {test.duration_minutes} min
                  </span>
                </div>

                {/* Attempt status */}
                {att && (
                  <div className="mb-3 flex items-center gap-2 p-2 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0]">
                    <CheckCircle size={12} className="text-[#10B981] shrink-0"/>
                    <span className="text-[10px] font-semibold text-[#166534]">
                      {att.status === "COMPLETED"
                        ? `Scored ${att.percentage?.toFixed(0) ?? 0}%`
                        : "In Progress"}
                    </span>
                  </div>
                )}

                {/* Action */}
                <div className="mt-auto">
                  {att?.status === "COMPLETED" ? (
                    <button className="w-full py-2 rounded-xl text-xs font-bold bg-[#F0F4FA] text-[#7A869A] cursor-default">
                      Retake Test
                    </button>
                  ) : att?.status === "IN_PROGRESS" ? (
                    <button className="w-full py-2 rounded-xl text-xs font-bold bg-[#FFFBEB] text-[#F59E0B] border border-[#FDE68A]">
                      Continue Test →
                    </button>
                  ) : canAfford ? (
                    <button onClick={() => handleStart(test)} disabled={isStarting}
                      className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50"
                      style={{ background: ec }}>
                      {isStarting ? <Loader2 size={12} className="animate-spin"/> : <Play size={12}/>}
                      {test.is_free ? "Start Free Test" : `Unlock (${test.credit_cost} ⭐)`}
                    </button>
                  ) : (
                    <button className="w-full py-2 rounded-xl text-xs font-bold bg-[#F0F4FA] text-[#94A3B8] flex items-center justify-center gap-2 cursor-not-allowed">
                      <Lock size={12}/> Need {test.credit_cost} Credits
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
