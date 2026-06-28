"use client";
import React, { useState, useEffect } from "react";
import { Star, TrendingUp, TrendingDown, Upload, Target, UserCheck, Gift, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Transaction {
  id: string; amount: number; type: string; description: string; created_at: string;
}
interface Profile { id: string; credit_balance: number; name: string; }

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  WELCOME_BONUS:   { icon: <Gift size={14}/>,      color: "#10B981", bg: "#ECFDF5" },
  RESOURCE_UPLOAD: { icon: <Upload size={14}/>,     color: "#3B82F6", bg: "#EFF6FF" },
  TEST_PURCHASE:   { icon: <Target size={14}/>,     color: "#8B5CF6", bg: "#F5F3FF" },
  TUTOR_EARNING:   { icon: <UserCheck size={14}/>,  color: "#F59E0B", bg: "#FFFBEB" },
  STORE_REDEEM:    { icon: <Star size={14}/>,       color: "#FF6B35", bg: "#FFF7F4" },
  ADMIN_GRANT:     { icon: <Gift size={14}/>,       color: "#10B981", bg: "#ECFDF5" },
  REFUND:          { icon: <TrendingUp size={14}/>, color: "#10B981", bg: "#ECFDF5" },
};

export default function AspirantCreditsPage() {
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [txns,     setTxns]     = useState<Transaction[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: prof } = await supabase.from("aspirant_profiles")
        .select("id, credit_balance, name").eq("user_id", user.id).single();
      setProfile(prof as Profile ?? null);
      if (prof) {
        const { data } = await supabase.from("credit_transactions")
          .select("*").eq("aspirant_id", prof.id).order("created_at", { ascending: false }).limit(50);
        setTxns((data ?? []) as Transaction[]);
      }
      setLoading(false);
    });
  }, []);

  const totalEarned = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent  = Math.abs(txns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#F59E0B]"/>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">My Credits</h1>
        <p className="text-sm text-[#7A869A]">Earn by uploading resources · Spend on premium tests</p>
      </div>

      {/* Balance hero */}
      <div className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/70 mb-1">Available Credits</p>
            <div className="text-5xl font-black">{profile?.credit_balance ?? 0}</div>
            <div className="flex items-center gap-1 mt-2 text-sm text-white/80">
              <Star size={14}/> Credits never expire
            </div>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Star size={28} className="text-white"/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/20">
          <div>
            <div className="text-lg font-bold">{totalEarned}</div>
            <div className="text-xs text-white/70 flex items-center gap-1"><TrendingUp size={11}/> Total Earned</div>
          </div>
          <div>
            <div className="text-lg font-bold">{totalSpent}</div>
            <div className="text-xs text-white/70 flex items-center gap-1"><TrendingDown size={11}/> Total Spent</div>
          </div>
        </div>
      </div>

      {/* Ways to earn */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5">
        <div className="text-sm font-bold text-[#1A2035] mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-[#10B981]"/> Ways to Earn More Credits
        </div>
        <div className="space-y-3">
          {[
            { action:"Upload Study Notes",     credits:5,  color:"#10B981", href:"/aspirant/resources", cta:"Upload Now" },
            { action:"Upload PYQ Set",         credits:10, color:"#3B82F6", href:"/aspirant/resources", cta:"Upload Now" },
            { action:"Upload Mock Test",       credits:20, color:"#8B5CF6", href:"/aspirant/resources", cta:"Upload Now" },
            { action:"Become a Verified Tutor",credits:50, color:"#FF6B35", href:"/aspirant/tutor",     cta:"Apply Now" },
            { action:"Earn from Tutor Session",credits:"85% of session fee", color:"#F59E0B", href:"/aspirant/tutor", cta:"View Profile" },
          ].map(e => (
            <div key={e.action} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${e.color}18`, color: e.color }}>
                <Star size={14}/>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#1A2035]">{e.action}</div>
                <div className="text-[10px] text-[#7A869A]">
                  {typeof e.credits === "number" ? `+${e.credits} credits per approved upload` : e.credits}
                </div>
              </div>
              <Link href={e.href}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90"
                style={{ background: e.color }}>
                {e.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035]">Transaction History</div>
          <div className="text-xs text-[#7A869A]">{txns.length} transactions</div>
        </div>
        {txns.length === 0 ? (
          <div className="py-12 text-center">
            <Star size={28} className="text-[#CBD5E1] mx-auto mb-2"/>
            <p className="text-xs text-[#7A869A]">No transactions yet. Start by uploading a resource!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F4FA]">
            {txns.map(t => {
              const meta = TYPE_META[t.type] ?? { icon: <Star size={14}/>, color:"#7A869A", bg:"#F0F4FA" };
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A2035] truncate">{t.description}</p>
                    <p className="text-[10px] text-[#7A869A]">
                      {new Date(t.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"2-digit", hour:"numeric", minute:"numeric" })}
                    </p>
                  </div>
                  <span className="text-sm font-black shrink-0"
                    style={{ color: t.amount > 0 ? "#10B981" : "#EF4444" }}>
                    {t.amount > 0 ? "+" : ""}{t.amount} ⭐
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
