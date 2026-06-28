"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

export default function StudentSettingsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [notifAssignments, setNotifAssignments] = useState(true);
  const [notifGames, setNotifGames] = useState(true);
  const [notifDoubts, setNotifDoubts] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const toggles = [
    { label: "Assignment due reminders", sub: "Get notified 1 hour before due", value: notifAssignments, setter: setNotifAssignments },
    { label: "Game challenges", sub: "When a classmate challenges you", value: notifGames, setter: setNotifGames },
    { label: "Doubt answers", sub: "When teacher answers your question", value: notifDoubts, setter: setNotifDoubts },
  ];

  const handleNameSave = async () => {
    if (!newName.trim()) { toast.error("Name cannot be empty"); return; }
    if (!user?.id) return;
    setSavingName(true);
    const { error } = await supabase.from("users").update({ name: newName.trim() }).eq("id", user.id);
    setSavingName(false);
    if (error) { toast.error("Failed to update name"); return; }
    toast.success("Name updated successfully!");
    setEditingName(false);
    setNewName("");
  };

  const handlePasswordSave = async () => {
    if (!newPassword.trim()) { toast.error("Password cannot be empty"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { toast.error(error.message || "Failed to update password"); return; }
    toast.success("Password updated successfully!");
    setEditingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Settings</h1>
        <p className="text-sm text-[#7A869A]">Manage your account preferences</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white bg-[#FF6B35]">
            {user.initials}
          </div>
          <div>
            <div className="text-base font-bold text-[#1A2035]">{user.name}</div>
            <div className="text-sm text-[#7A869A]">{user.className ?? "—"}</div>
            <div className="text-xs text-[#7A869A]">{user.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-[#FFF7F4] rounded-xl">
            <div className="text-lg font-bold text-[#FF6B35]">{(user.totalXp ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-[#7A869A]">Total XP</div>
          </div>
          <div className="p-3 bg-[#F5F3FF] rounded-xl">
            <div className="text-lg font-bold text-[#8B5CF6]">Lv. {user.level ?? 1}</div>
            <div className="text-[10px] text-[#7A869A]">Level</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Notifications</h2>
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

      {/* Account */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Account</h2>
        <div className="space-y-3">
          {/* Change Name */}
          {editingName ? (
            <div className="space-y-2 px-4 py-3 rounded-xl bg-[#F0F4FA]">
              <div className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider">New Name</div>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={user.name}
                className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNameSave}
                  disabled={savingName}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-xs font-bold hover:bg-[#E55A28] transition-colors disabled:opacity-60"
                >
                  {savingName ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingName(false); setNewName(""); }} className="px-4 py-2 border border-[#E8EDF5] text-[#7A869A] rounded-xl text-xs font-medium hover:bg-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setEditingName(true); setNewName(user.name ?? ""); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#F0F4FA] transition-colors text-sm text-[#1A2035]">
              Change Name
            </button>
          )}

          {/* Change Password */}
          {editingPassword ? (
            <div className="space-y-2 px-4 py-3 rounded-xl bg-[#F0F4FA]">
              <div className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider">New Password</div>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-white text-sm text-[#1A2035] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePasswordSave}
                  disabled={savingPassword}
                  className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-xs font-bold hover:bg-[#E55A28] transition-colors disabled:opacity-60"
                >
                  {savingPassword ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingPassword(false); setNewPassword(""); setConfirmPassword(""); }} className="px-4 py-2 border border-[#E8EDF5] text-[#7A869A] rounded-xl text-xs font-medium hover:bg-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingPassword(true)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#F0F4FA] transition-colors text-sm text-[#1A2035]">
              Change Password
            </button>
          )}

          <button onClick={() => toast.error("Contact your teacher to delete account")} className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#FEF2F2] transition-colors text-sm text-[#EF4444]">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
