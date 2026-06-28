"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

export default function CmsSettingsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [notifReviews, setNotifReviews] = useState(true);
  const [notifSchools, setNotifSchools] = useState(true);
  const [notifAI, setNotifAI] = useState(false);
  const [aiAutoPublish, setAiAutoPublish] = useState(false);
  const [minReviewScore, setMinReviewScore] = useState(85);

  useEffect(() => {
    if (user) setName(user.name || "");
  }, [user]);

  useEffect(() => {
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    const [{ count: qCount }, { count: sCount }] = await Promise.all([
      supabase.from("question").select("id", { count: "exact", head: true }),
      supabase.from("schools").select("id", { count: "exact", head: true }),
    ]);
    setQuestionCount(qCount || 0);
    setSchoolCount(sCount || 0);
    setStatsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    const { error } = await supabase.from("users").update({ name }).eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setEditingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { toast.error("Enter a new password"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message || "Failed to update password");
    } else {
      toast.success("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const initials = user?.initials || (user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "?");

  const toggles = [
    { label: "New review queue items", sub: "When a teacher submits content for review", value: notifReviews, setter: setNotifReviews },
    { label: "New school onboarded", sub: "When a new school joins the platform", value: notifSchools, setter: setNotifSchools },
    { label: "AI generation reports", sub: "Daily AI content generation summary email", value: notifAI, setter: setNotifAI },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Settings</h1>
        <p className="text-sm text-[#7A869A]">CMS platform configuration</p>
      </div>

      {/* Admin profile */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-[#FF6B35]">
            {initials}
          </div>
          <div>
            <div className="text-base font-bold text-[#1A2035]">{user?.name || "—"}</div>
            <div className="text-sm text-[#7A869A]">CMS Admin</div>
            <div className="text-xs text-[#7A869A]">{user?.email || "—"}</div>
          </div>
        </div>

        {editingProfile ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 py-2 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E55A28] transition-colors disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => { setEditingProfile(false); setName(user?.name || ""); }}
                className="flex-1 py-2 rounded-xl border border-[#E8EDF5] text-sm text-[#7A869A] hover:bg-[#F0F4FA] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={() => setEditingProfile(true)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#F0F4FA] transition-colors text-sm text-[#1A2035]">Edit Profile</button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">Change Password</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="w-full py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E55A28] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingPassword && <Loader2 size={14} className="animate-spin" />}
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      {/* Platform stats */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">Platform Statistics</div>
        {statsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-[#FF6B35]" />
          </div>
        ) : (
          <div className="space-y-2">
            {[
              { label: "Total questions", value: questionCount?.toLocaleString() ?? "—" },
              { label: "Active schools", value: schoolCount ?? "—" },
            ].map(s => (
              <div key={s.label} className="flex justify-between py-2 border-b border-[#F0F4FA] last:border-0 text-xs">
                <span className="text-[#7A869A]">{s.label}</span>
                <span className="font-bold text-[#1A2035]">{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI settings */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">AI Configuration</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#1A2035]">Auto-publish AI content</div>
              <div className="text-xs text-[#7A869A]">Skip review for high-confidence AI questions</div>
            </div>
            <button
              onClick={() => { setAiAutoPublish(!aiAutoPublish); toast.success(`Auto-publish ${!aiAutoPublish ? "enabled" : "disabled"}`); }}
              className="w-11 h-6 rounded-full transition-all duration-200 relative shrink-0"
              style={{ background: aiAutoPublish ? "#FF6B35" : "#E8EDF5" }}
            >
              <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200" style={{ left: aiAutoPublish ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-[#1A2035]">Minimum review score</span>
              <span className="text-sm font-bold text-[#FF6B35]">{minReviewScore}%</span>
            </div>
            <input
              type="range" min={70} max={100} value={minReviewScore}
              onChange={e => setMinReviewScore(+e.target.value)}
              className="w-full accent-[#FF6B35]"
            />
            <div className="flex justify-between text-[10px] text-[#7A869A] mt-1">
              <span>70% Lenient</span>
              <span>100% Strict</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">Notifications</div>
        <div className="space-y-4">
          {toggles.map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1A2035]">{item.label}</div>
                <div className="text-xs text-[#7A869A]">{item.sub}</div>
              </div>
              <button
                onClick={() => { item.setter(!item.value); toast.success(`${item.label} ${!item.value ? "enabled" : "disabled"}`); }}
                className="w-11 h-6 rounded-full transition-all duration-200 relative shrink-0"
                style={{ background: item.value ? "#FF6B35" : "#E8EDF5" }}
              >
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200" style={{ left: item.value ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
