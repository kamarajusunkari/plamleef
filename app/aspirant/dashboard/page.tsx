"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target, Star, BookOpen, UserCheck, TrendingUp, Clock,
  ChevronRight, Upload, Trophy, Zap, ArrowRight, CheckCircle,
  FileText, Play, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  name: string; email: string; credit_balance: number;
  exam_targets: string[]; verification_status: string; is_tutor: boolean;
}
interface RecentAttempt {
  id: string; percentage: number; status: string; created_at: string;
  test: { title: string; exam_type: string; subject: string } | null;
}
interface RecentResource {
  id: string; title: string; type: string; status: string; credits_awarded: number; created_at: string;
}

const EXAM_COLORS: Record<string, { bg: string; color: string }> = {
  SSC:      { bg: "#EFF6FF", color: "#3B82F6" },
  UPSC:     { bg: "#F5F3FF", color: "#8B5CF6" },
  RRB:      { bg: "#ECFDF5", color: "#10B981" },
  BANK_PO:  { bg: "#FFFBEB", color: "#F59E0B" },
  NDA:      { bg: "#FFF7F4", color: "#FF6B35" },
  CTET:     { bg: "#FEF2F2", color: "#EF4444" },
  STATE_PSC:{ bg: "#F0FDF4", color: "#22C55E" },
};

export default function AspirantDashboard() {
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [attempts, setAttempts]     = useState<RecentAttempt[]>([]);
  const [resources, setResources]   = useState<RecentResource[]>([]);
  const [totalAttempts, setTotal]   = useState(0);
  const [avgScore, setAvgScore]     = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: prof } = await supabase
        .from("aspirant_profiles").select("*").eq("user_id", user.id).single();

      if (!prof) { setLoading(false); return; }
      setProfile(prof as Profile);

      const [{ data: att }, { data: res }] = await Promise.all([
        supabase.from("aspirant_test_attempts")
          .select("id, percentage, status, created_at, test:test_id(title, exam_type, subject)")
          .eq("aspirant_id", prof.id)
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("aspirant_resources")
          .select("id, title, type, status, credits_awarded, created_at")
          .eq("aspirant_id", prof.id)
          .order("created_at", { ascending: false }).limit(5),
      ]);

      const allAtt = (att ?? []) as unknown as RecentAttempt[];
      setAttempts(allAtt);
      setResources((res ?? []) as unknown as RecentResource[]);
      setTotal(allAtt.length);
      const completed = allAtt.filter(a => a.status === "COMPLETED" && a.percentage !== null);
      setAvgScore(completed.length > 0 ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length) : null);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-[#F59E0B]" />
    </div>
  );

  if (!profile) return (
    <div className="max-w-lg mx-auto mt-20 text-center">
      <div className="text-4xl mb-4">🎯</div>
      <h2 className="text-xl font-bold text-[#1A2035] mb-2">Complete Your Profile</h2>
      <p className="text-sm text-[#7A869A] mb-6">Set up your aspirant profile to start your exam preparation journey.</p>
      <Link href="/aspirant/settings" className="px-6 py-3 bg-[#F59E0B] text-white rounded-xl font-bold text-sm hover:bg-[#D97706] transition-colors">
        Set Up Profile
      </Link>
    </div>
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">{greeting()}, {profile.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-[#7A869A]">
            {profile.exam_targets.length > 0
              ? `Preparing for: ${profile.exam_targets.join(" · ")}`
              : "Set your exam targets to get personalised tests"}
          </p>
        </div>
        <Link href="/aspirant/tests"
          className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-xl text-sm font-bold hover:bg-[#D97706] transition-colors">
          <Target size={15}/> Take a Test
        </Link>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Credits",        value: profile.credit_balance, icon: <Star size={18}/>,      color: "#F59E0B", bg: "#FFFBEB", href: "/aspirant/credits" },
          { label: "Tests Taken",    value: totalAttempts,          icon: <Target size={18}/>,     color: "#8B5CF6", bg: "#F5F3FF", href: "/aspirant/tests" },
          { label: "Avg Score",      value: avgScore !== null ? `${avgScore}%` : "—", icon: <TrendingUp size={18}/>, color: "#10B981", bg: "#ECFDF5", href: "/aspirant/tests" },
          { label: "Uploads",        value: resources.length,       icon: <Upload size={18}/>,     color: "#3B82F6", bg: "#EFF6FF", href: "/aspirant/resources" },
        ].map(s => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-2xl p-4 border border-[#E8EDF5] hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <ChevronRight size={13} className="text-[#CBD5E1] group-hover:text-[#7A869A] mt-1 transition-colors"/>
            </div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#7A869A] mt-0.5">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Exam targets */}
      {profile.exam_targets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.exam_targets.map(e => {
            const es = EXAM_COLORS[e] ?? { bg: "#F0F4FA", color: "#7A869A" };
            return (
              <span key={e} className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                style={{ background: es.bg, color: es.color }}>
                <Target size={10}/> {e}
              </span>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href:"/aspirant/tests",     icon:<Play size={18}/>,     label:"Start Test",       desc:"Take a practice test",          color:"#8B5CF6", bg:"#F5F3FF" },
            { href:"/aspirant/resources", icon:<Upload size={18}/>,   label:"Upload Resource",  desc:"Earn credits for notes",         color:"#10B981", bg:"#ECFDF5" },
            { href:"/aspirant/tutor",     icon:<UserCheck size={18}/>,label:"Become a Tutor",   desc:"Teach school students",          color:"#FF6B35", bg:"#FFF7F4" },
            { href:"/aspirant/credits",   icon:<Star size={18}/>,     label:"Earn Credits",     desc:"View ways to earn",              color:"#F59E0B", bg:"#FFFBEB" },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="bg-white rounded-2xl p-4 border border-[#E8EDF5] hover:shadow-md transition-all group flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                style={{ background: a.bg, color: a.color }}>{a.icon}</div>
              <div>
                <div className="text-xs font-bold text-[#1A2035]">{a.label}</div>
                <div className="text-[10px] text-[#7A869A]">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tutor status banner */}
      {!profile.is_tutor && (
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="text-white">
            <div className="font-bold text-sm flex items-center gap-2"><Zap size={16}/> Become a Tutor & Earn Money</div>
            <div className="text-xs text-white/80 mt-0.5">Teach school students online · ₹200–₹800/hour · EduBattle takes only 15%</div>
          </div>
          <Link href="/aspirant/tutor"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-sm font-bold text-[#FF6B35] hover:bg-white/90 transition-colors shrink-0">
            Apply Now <ArrowRight size={14}/>
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent test attempts */}
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EDF5]">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1A2035]">
              <Target size={15} className="text-[#8B5CF6]"/> Recent Tests
            </div>
            <Link href="/aspirant/tests" className="text-xs text-[#F59E0B] font-semibold flex items-center gap-1 hover:underline">
              All tests <ArrowRight size={11}/>
            </Link>
          </div>
          {attempts.length === 0 ? (
            <div className="py-10 text-center">
              <Trophy size={28} className="text-[#CBD5E1] mx-auto mb-2"/>
              <p className="text-xs text-[#7A869A]">No tests taken yet</p>
              <Link href="/aspirant/tests" className="inline-block mt-3 px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-xs font-bold">
                Start First Test
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F4FA]">
              {attempts.map(a => {
                const es = EXAM_COLORS[a.test?.exam_type ?? ""] ?? { bg: "#F0F4FA", color: "#7A869A" };
                const pct = a.percentage ?? 0;
                return (
                  <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={es}>
                      <Target size={14}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1A2035] truncate">{a.test?.title ?? "Test"}</p>
                      <p className="text-[10px] text-[#7A869A]">{a.test?.subject} · {a.test?.exam_type}</p>
                    </div>
                    {a.status === "COMPLETED" ? (
                      <span className="text-xs font-bold" style={{ color: pct >= 70 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444" }}>
                        {pct.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] font-semibold">In Progress</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent uploads */}
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EDF5]">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1A2035]">
              <FileText size={15} className="text-[#10B981]"/> My Uploads
            </div>
            <Link href="/aspirant/resources" className="text-xs text-[#F59E0B] font-semibold flex items-center gap-1 hover:underline">
              Manage <ArrowRight size={11}/>
            </Link>
          </div>
          {resources.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen size={28} className="text-[#CBD5E1] mx-auto mb-2"/>
              <p className="text-xs text-[#7A869A]">Upload your notes to earn credits</p>
              <Link href="/aspirant/resources" className="inline-block mt-3 px-4 py-2 bg-[#10B981] text-white rounded-xl text-xs font-bold">
                Upload Now
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F4FA]">
              {resources.map(r => {
                const statusStyle =
                  r.status === "APPROVED"       ? { bg: "#ECFDF5", color: "#10B981", label: "Approved" } :
                  r.status === "PENDING_REVIEW" ? { bg: "#FFFBEB", color: "#F59E0B", label: "Pending" } :
                                                  { bg: "#FEF2F2", color: "#EF4444", label: "Rejected" };
                return (
                  <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                      <FileText size={14}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1A2035] truncate">{r.title}</p>
                      <p className="text-[10px] text-[#7A869A]">{r.type}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                      {r.credits_awarded > 0 && (
                        <span className="text-[9px] text-[#F59E0B] font-bold">+{r.credits_awarded} ⭐</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* How to earn credits */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5">
        <div className="text-sm font-bold text-[#1A2035] mb-4 flex items-center gap-2">
          <Star size={15} className="text-[#F59E0B]"/> How to Earn Credits
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { action: "Upload Notes",      credits: "+5",  color: "#10B981", bg:"#ECFDF5", desc:"Per approved resource" },
            { action: "Upload PYQ Set",    credits: "+10", color: "#3B82F6", bg:"#EFF6FF", desc:"Per approved set" },
            { action: "Upload Mock Test",  credits: "+20", color: "#8B5CF6", bg:"#F5F3FF", desc:"Per approved mock" },
            { action: "Complete Profile",  credits: "+5",  color: "#F59E0B", bg:"#FFFBEB", desc:"One time bonus" },
          ].map(e => (
            <div key={e.action} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: e.bg }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: e.color }}>
                <CheckCircle size={13} className="text-white"/>
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: e.color }}>{e.credits} credits</div>
                <div className="text-[10px] font-semibold text-[#1A2035]">{e.action}</div>
                <div className="text-[9px] text-[#7A869A]">{e.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <span className="text-[10px] text-[#7A869A]">Welcome Bonus: You start with </span>
          <span className="text-[10px] font-bold text-[#F59E0B]">10 Free Credits 🎁</span>
        </div>
      </div>
    </div>
  );
}
