"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload, ArrowRight, BookOpen, FileText, Layers,
  CheckCircle, Clock, ChevronRight, Database,
  Users, AlertCircle, Edit3, Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectStat { name: string; count: number; color: string; }
interface RecentResource {
  id: string; title: string; type: string; subject: string;
  visibility: string; created_at: string; uploaderName: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6", Science: "#10B981", English: "#8B5CF6",
  Hindi: "#F59E0B", "Social Studies": "#EC4899", Physics: "#6366F1",
  Chemistry: "#14B8A6", Biology: "#84CC16",
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  PDF:       { bg: "#EFF6FF", color: "#3B82F6" },
  VIDEO:     { bg: "#FEF9C3", color: "#854D0E" },
  FLASHCARD: { bg: "#F5F3FF", color: "#8B5CF6" },
  QUIZ:      { bg: "#FFF7F4", color: "#FF6B35" },
  NOTES:     { bg: "#ECFDF5", color: "#10B981" },
};

// ─── Dashboard cache (60 s TTL — survives tab switches within session) ────────
interface DashCache {
  totalResources: number; pendingReview: number;
  totalSchools: number;   totalStaff: number;
  subjectStats: SubjectStat[]; recentResources: RecentResource[];
}
let _dashCache: DashCache | null = null;
let _dashCacheAt = 0;
const DASH_TTL = 60_000;

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const [totalResources, setTotalResources] = useState<number | null>(null);
  const [totalSchools,  setTotalSchools]  = useState<number | null>(null);
  const [totalStaff,    setTotalStaff]    = useState<number | null>(null);
  const [pendingReview, setPendingReview] = useState<number | null>(null);
  const [subjectStats,  setSubjectStats]  = useState<SubjectStat[]>([]);
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [loading, setLoading] = useState(!_dashCache || Date.now() - _dashCacheAt > DASH_TTL);

  useEffect(() => {
    // Serve cached data instantly if still fresh
    if (_dashCache && Date.now() - _dashCacheAt < DASH_TTL) {
      setTotalResources(_dashCache.totalResources);
      setPendingReview(_dashCache.pendingReview);
      setTotalSchools(_dashCache.totalSchools);
      setTotalStaff(_dashCache.totalStaff);
      setSubjectStats(_dashCache.subjectStats);
      setRecentResources(_dashCache.recentResources);
      setLoading(false);
      return;
    }

    async function fetchStats() {
      // Single RPC replaces 5 separate queries + sequential recent-resources query
      const { data, error } = await createClient().rpc("get_cms_dashboard_stats");
      if (error || !data) { setLoading(false); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const stats: SubjectStat[] = (d.subjectBreakdown ?? []).map((s: { name: string; count: number }) => ({
        name: s.name, count: s.count, color: SUBJECT_COLORS[s.name] ?? "#7A869A",
      }));
      const recent: RecentResource[] = (d.recentResources ?? []).map((r: {
        id: string; title: string; type: string; visibility: string;
        created_at: string; subject: string; uploader_name: string;
      }) => ({ ...r, uploaderName: r.uploader_name }));

      setTotalResources(d.totalResources ?? 0);
      setPendingReview(d.pendingReview ?? 0);
      setTotalSchools(d.totalSchools ?? 0);
      setTotalStaff(d.totalStaff ?? 0);
      setSubjectStats(stats);
      setRecentResources(recent);
      setLoading(false);

      // Store in module-level cache
      _dashCache = { totalResources: d.totalResources ?? 0, pendingReview: d.pendingReview ?? 0,
        totalSchools: d.totalSchools ?? 0, totalStaff: d.totalStaff ?? 0,
        subjectStats: stats, recentResources: recent };
      _dashCacheAt = Date.now();
    }
    fetchStats();
  }, []);

  const maxCount = Math.max(...subjectStats.map(s => s.count), 1);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">Super Admin Dashboard</h1>
          <p className="text-sm text-[#7A869A]">
            {loading
              ? <span className="inline-block h-3 w-48 bg-[#F0F4FA] rounded animate-pulse"/>
              : `${(totalResources ?? 0).toLocaleString()} total resources · Platform overview`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cms/staff" className="flex items-center gap-2 px-3 py-2 border border-[#E8EDF5] rounded-xl text-sm font-semibold text-[#1A2035] hover:bg-[#F0F4FA] transition-colors">
            <Users size={14} /> Staff
          </Link>
          <Link href="/cms/upload" className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55A28] transition-colors">
            <Upload size={14} /> Upload Content
          </Link>
        </div>
      </div>

      {/* Alert for pending review */}
      {!loading && (pendingReview ?? 0) > 0 && (
        <Link href="/cms/review" className="flex items-center gap-3 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl hover:bg-[#FEF9C3] transition-colors">
          <AlertCircle size={18} className="text-[#F59E0B] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#92400E]">
              {pendingReview} resource{(pendingReview ?? 0) > 1 ? "s" : ""} waiting for your review
            </p>
            <p className="text-xs text-[#B45309]">Click to open the review queue</p>
          </div>
          <ChevronRight size={16} className="text-[#F59E0B]" />
        </Link>
      )}

      {/* Platform metrics row */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/cms/review" className="bg-white rounded-2xl p-4 border border-[#E8EDF5] hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FFFBEB] text-[#F59E0B]"><Clock size={18}/></div>
            <ChevronRight size={13} className="text-[#CBD5E1] group-hover:text-[#7A869A] mt-1 transition-colors"/>
          </div>
          {loading
            ? <div className="h-7 w-10 bg-[#FDE68A] rounded-lg animate-pulse"/>
            : <div className="text-2xl font-black text-[#F59E0B]">{pendingReview ?? 0}</div>}
          <div className="text-xs text-[#7A869A] mt-0.5">Pending Review</div>
        </Link>

        <Link href="/cms/schools" className="bg-white rounded-2xl p-4 border border-[#E8EDF5] hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#ECFDF5] text-[#10B981]"><Database size={18}/></div>
            <ChevronRight size={13} className="text-[#CBD5E1] group-hover:text-[#7A869A] mt-1 transition-colors"/>
          </div>
          {loading
            ? <div className="h-7 w-10 bg-[#BBF7D0] rounded-lg animate-pulse"/>
            : <div className="text-2xl font-black text-[#1A2035]">{totalSchools ?? 0}</div>}
          <div className="text-xs text-[#7A869A] mt-0.5">Active Schools</div>
        </Link>

        <Link href="/cms/staff" className="bg-white rounded-2xl p-4 border border-[#E8EDF5] hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F5F3FF] text-[#8B5CF6]"><Users size={18}/></div>
            <ChevronRight size={13} className="text-[#CBD5E1] group-hover:text-[#7A869A] mt-1 transition-colors"/>
          </div>
          {loading
            ? <div className="h-7 w-10 bg-[#DDD6FE] rounded-lg animate-pulse"/>
            : <div className="text-2xl font-black text-[#1A2035]">{totalStaff ?? 0}</div>}
          <div className="text-xs text-[#7A869A] mt-0.5">CMS Team Members</div>
        </Link>
      </div>

      {/* Quick actions */}
      <div>
        <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-3">Quick Actions</div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { href: "/cms/review",   label: "Review Queue",    icon: <Clock size={15} />,    desc: `${pendingReview ?? 0} pending`, color: "#F59E0B", bg: "#FFFBEB" },
            { href: "/cms/topics",   label: "Manage Topics",   icon: <Tag size={15} />,      desc: "Control upload topics",        color: "#FF6B35", bg: "#FFF7F4" },
            { href: "/cms/schools",  label: "Onboard School",  icon: <Database size={15} />, desc: "Add new school",               color: "#10B981", bg: "#ECFDF5" },
            { href: "/cms/staff",    label: "Add Staff",       icon: <Users size={15} />,    desc: "Create team accounts",         color: "#8B5CF6", bg: "#F5F3FF" },
            { href: "/cms/library",  label: "Content Library", icon: <BookOpen size={15} />, desc: "Browse all resources",         color: "#3B82F6", bg: "#EFF6FF" },
          ].map(l => (
            <Link key={l.href} href={l.href} className="bg-white rounded-2xl p-4 border border-[#E8EDF5] hover:shadow-md transition-all group">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ background: l.bg, color: l.color }}>
                {l.icon}
              </div>
              <div className="text-xs font-bold text-[#1A2035] mb-0.5">{l.label}</div>
              <div className="text-[10px] text-[#7A869A]">{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Resources by subject */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-[#1A2035]">Resources by Subject</div>
            <Link href="/cms/library" className="text-xs text-[#FF6B35] font-semibold hover:underline flex items-center gap-1">
              Library <ArrowRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-[#F0F4FA] rounded-xl animate-pulse" />)}</div>
          ) : subjectStats.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={28} className="text-[#CBD5E1] mx-auto mb-2" />
              <div className="text-xs text-[#7A869A]">No content yet</div>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectStats.slice(0, 8).map(s => (
                <Link key={s.name} href={`/cms/library?subject=${encodeURIComponent(s.name)}`}
                  className="flex items-center gap-3 hover:bg-[#F8FAFC] rounded-xl px-1 py-0.5 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <div className="w-24 text-xs font-medium text-[#1A2035] truncate">{s.name}</div>
                  <div className="flex-1 h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.count / maxCount) * 100}%`, background: s.color }} />
                  </div>
                  <div className="text-xs font-bold text-[#1A2035] w-7 text-right">{s.count}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent submissions */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EDF5]">
            <div className="text-sm font-bold text-[#1A2035]">Recent Submissions</div>
            <Link href="/cms/review" className="text-xs text-[#FF6B35] font-semibold hover:underline">Review all</Link>
          </div>
          {loading ? (
            <div className="divide-y divide-[#F0F4FA]">
              {[1,2,3,4].map(i => (
                <div key={i} className="px-6 py-3 flex items-center gap-3">
                  <div className="flex-1 h-4 bg-[#F0F4FA] rounded animate-pulse" />
                  <div className="w-16 h-4 bg-[#F0F4FA] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentResources.length === 0 ? (
            <div className="text-center py-10">
              <Upload size={28} className="text-[#CBD5E1] mx-auto mb-2" />
              <div className="text-sm font-semibold text-[#1A2035] mb-1">No submissions yet</div>
              <div className="text-xs text-[#7A869A]">Staff content will appear here</div>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F4FA]">
              {recentResources.map(r => {
                const ts = TYPE_STYLE[r.type] ?? { bg: "#F0F4FA", color: "#7A869A" };
                const isPending = r.visibility === "PENDING_REVIEW";
                return (
                  <Link key={r.id} href="/cms/library" className="flex items-center gap-3 px-6 py-3 hover:bg-[#F8FAFC] transition-colors">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: ts.bg, color: ts.color }}>{r.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1A2035] truncate">{r.title}</p>
                      <p className="text-[10px] text-[#7A869A]">
                        {r.subject} · by {r.uploaderName} · {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${isPending ? "bg-[#FFFBEB] text-[#F59E0B]" : "bg-[#ECFDF5] text-[#10B981]"}`}>
                      {isPending ? "Pending" : "Live"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────────

function StaffDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [myTotal, setMyTotal]       = useState<number | null>(null);
  const [myPending, setMyPending]   = useState<number | null>(null);
  const [myApproved, setMyApproved] = useState<number | null>(null);
  const [myRejected, setMyRejected] = useState<number | null>(null);
  const [recentMine, setRecentMine] = useState<RecentResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    // Single RPC replaces: 4 count queries + 1 list query (was 5 round-trips)
    createClient()
      .rpc("get_staff_dashboard_stats", { p_user_id: userId })
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = data as any;
          setMyTotal(d.total ?? 0);
          setMyPending(d.pending ?? 0);
          setMyApproved(d.approved ?? 0);
          setMyRejected(d.rejected ?? 0);
          setRecentMine((d.recent ?? []).map((r: {
            id: string; title: string; type: string;
            visibility: string; created_at: string; subject: string;
          }) => ({ ...r, uploaderName: userName })));
        }
        setLoading(false);
      });
  }, [userId, userName]);

  const approvalRate = (myTotal ?? 0) > 0
    ? Math.round(((myApproved ?? 0) / (myTotal ?? 1)) * 100)
    : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A2035]">My Dashboard</h1>
          <p className="text-sm text-[#7A869A]">Your content submissions and review status</p>
        </div>
        <Link href="/cms/upload" className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-bold hover:bg-[#7C3AED] transition-colors">
          <Upload size={14} /> Upload Content
        </Link>
      </div>

      {/* Status info */}
      <div className="flex items-center gap-3 p-4 bg-[#F5F3FF] border border-[#DDD6FE] rounded-2xl">
        <Edit3 size={16} className="text-[#8B5CF6] shrink-0" />
        <p className="text-sm text-[#5B21B6]">
          You're a <strong>Content Staff</strong> member. Your uploads go to the review queue and are published once a Super Admin approves them.
        </p>
      </div>

      {/* Primary stats — Published & In Queue highlighted */}
      <div className="grid grid-cols-2 gap-4">
        {/* Published (Approved & Live) */}
        <div className="bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] rounded-2xl p-5 border border-[#A7F3D0] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-black text-[#10B981]">
                {loading ? "—" : (myApproved ?? 0)}
              </div>
              <div className="text-sm font-bold text-[#065F46] mt-0.5">Published</div>
              <div className="text-xs text-[#6EE7B7] mt-0.5">Live on the platform</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#10B981] flex items-center justify-center shrink-0">
              <CheckCircle size={22} className="text-white" />
            </div>
          </div>
          {/* Approval rate bar */}
          {!loading && (myTotal ?? 0) > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-semibold text-[#065F46] mb-1.5">
                <span>Approval rate</span>
                <span>{approvalRate ?? 0}%</span>
              </div>
              <div className="h-1.5 bg-[#A7F3D0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full transition-all duration-700"
                  style={{ width: `${approvalRate ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* In Queue (Pending) */}
        <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] rounded-2xl p-5 border border-[#FDE68A] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-black text-[#F59E0B]">
                {loading ? "—" : (myPending ?? 0)}
              </div>
              <div className="text-sm font-bold text-[#92400E] mt-0.5">In Queue</div>
              <div className="text-xs text-[#FCD34D] mt-0.5">Awaiting admin review</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] flex items-center justify-center shrink-0">
              <Clock size={22} className="text-white" />
            </div>
          </div>
          {/* Sub-stats */}
          <div className="mt-4 flex items-center gap-3">
            <div className="text-[10px] text-[#92400E]">
              <span className="font-bold">{myTotal ?? 0}</span> total uploads ·{" "}
              <span className="font-bold text-[#EF4444]">{myRejected ?? 0}</span> rejected
            </div>
          </div>
        </div>
      </div>

      {/* Quick upload cards — NO AI generator for staff */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: "/cms/upload", icon: <FileText size={20} />, label: "Upload PDF / Notes", desc: "Add study material, notes or question papers", color: "#3B82F6", bg: "#EFF6FF" },
          { href: "/cms/upload", icon: <Layers size={20} />,   label: "Create Flashcards", desc: "Build interactive flip-card sets for students",  color: "#10B981", bg: "#ECFDF5" },
        ].map(c => (
          <Link key={c.label} href={c.href} className="bg-white rounded-2xl p-5 border border-[#E8EDF5] hover:shadow-md transition-all group flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: c.bg, color: c.color }}>
              {c.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A2035] mb-0.5">{c.label}</div>
              <div className="text-xs text-[#7A869A]">{c.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* My recent submissions */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035]">My Submissions</div>
          <Link href="/cms/library" className="text-xs text-[#8B5CF6] font-semibold hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="divide-y divide-[#F0F4FA]">
            {[1,2,3].map(i => <div key={i} className="px-6 py-3 h-12 bg-[#F0F4FA] animate-pulse" />)}
          </div>
        ) : recentMine.length === 0 ? (
          <div className="text-center py-10">
            <Upload size={28} className="text-[#CBD5E1] mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#1A2035] mb-1">No submissions yet</div>
            <div className="text-xs text-[#7A869A] mb-4">Upload your first piece of content</div>
            <Link href="/cms/upload" className="px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-xs font-bold">Start Uploading</Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F4FA]">
            {recentMine.map(r => {
              const ts = TYPE_STYLE[r.type] ?? { bg: "#F0F4FA", color: "#7A869A" };
              const vis = r.visibility;
              const visStyle =
                vis === "PUBLIC"          ? { bg: "#ECFDF5", color: "#10B981", label: "Live" } :
                vis === "PENDING_REVIEW"  ? { bg: "#FFFBEB", color: "#F59E0B", label: "Pending" } :
                vis === "REJECTED"        ? { bg: "#FEF2F2", color: "#EF4444", label: "Rejected" } :
                { bg: "#F0F4FA", color: "#7A869A", label: vis };
              return (
                <div key={r.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: ts.bg, color: ts.color }}>{r.type}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A2035] truncate">{r.title}</p>
                    <p className="text-[10px] text-[#7A869A]">
                      {r.subject} · {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: visStyle.bg, color: visStyle.color }}>
                    {visStyle.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Entry Point ─────────────────────────────────────────────────────────

export default function CmsDashboardPage() {
  const { user, loading } = useCurrentUser();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role === "CMS_ADMIN") {
    return <AdminDashboard />;
  }

  return <StaffDashboard userId={user.id} userName={user.name} />;
}
