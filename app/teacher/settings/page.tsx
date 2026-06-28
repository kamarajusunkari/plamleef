"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

export default function TeacherSettingsPage() {
  const { user } = useCurrentUser();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifDoubts, setNotifDoubts] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifAssignments, setNotifAssignments] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("users")
      .update({ name })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const initials = user?.initials || (user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "?");

  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Settings</h1>
        <p className="text-sm text-[#7A869A]">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Profile Information</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-[#8B5CF6]">
            {initials}
          </div>
          <div>
            <div className="text-sm font-bold text-[#1A2035]">{user?.name || "—"}</div>
            <div className="text-xs text-[#7A869A]">{user?.email || "—"}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F0F4FA] text-sm text-[#7A869A] outline-none cursor-not-allowed"
            />
            <p className="text-[10px] text-[#94A3B8] mt-1">Email cannot be changed here</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Change Password</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full h-10 px-4 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED] transition-colors disabled:opacity-50"
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <h2 className="text-sm font-semibold text-[#1A2035] mb-4">Notifications</h2>
        <div className="space-y-4">
          {[
            { label: "New student doubts", sub: "Alert when students ask questions", value: notifDoubts, setter: setNotifDoubts },
            { label: "Parent messages", sub: "Alert when parents send messages", value: notifMessages, setter: setNotifMessages },
            { label: "Assignment submissions", sub: "Alert when students submit", value: notifAssignments, setter: setNotifAssignments },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1A2035]">{item.label}</div>
                <div className="text-xs text-[#7A869A]">{item.sub}</div>
              </div>
              <button
                onClick={() => { item.setter(!item.value); toast.success(`${item.label} notifications ${!item.value ? "enabled" : "disabled"}`); }}
                className="w-11 h-6 rounded-full transition-all duration-200 relative"
                style={{ background: item.value ? "#8B5CF6" : "#E8EDF5" }}
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
