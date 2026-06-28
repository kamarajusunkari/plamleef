"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Upload, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/school/PageHeader";
import { Card } from "@/components/school/Card";
import { Button } from "@/components/school/Button";

const TABS = ["School Profile", "Subscription", "Notifications", "Security"];

export default function SettingsPage() {
  const { user, loading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState(0);

  const [profile, setProfile] = useState({
    name: "",
    board: "",
    city: "",
    state: "",
    website: "",
  });

  const [saving, setSaving] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    lowAttendance: true,
    overdueReminder: true,
    parentMessage: true,
    newTeacher: false,
    belowThreshold: true,
    gameSession: false,
    threshold: "75",
  });

  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.schoolDisplayName ?? "",
        board: user.board ?? "",
        city: user.city ?? "",
        state: user.state ?? "",
        website: user.website ?? "",
      });
    }
  }, [user]);

  const toggleNotif = (key: string) => {
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSaveProfile = async () => {
    if (!user?.schoolId) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("schools")
      .update({
        display_name: profile.name,
        board: profile.board,
        city: profile.city,
        state: profile.state,
        website: profile.website,
      })
      .eq("id", user.schoolId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Profile updated");
    }
  };

  if (loading || !user) {
    return (
      <div className="animate-fadeIn flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Settings" />

      <div className="flex gap-1 mb-6">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === i ? "bg-[#FF6B35] text-white" : "text-[#7A869A] hover:bg-[#F0F4FA]"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <Card className="max-w-2xl">
          <div className="text-sm font-semibold text-[#1A2035] mb-5">School Profile</div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#1A2035] mb-1 block">School Name</label>
              <input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1A2035] mb-2 block">Board</label>
              <div className="flex gap-2">
                {["CBSE", "ICSE", "STATE"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setProfile((p) => ({ ...p, board: b }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${profile.board === b ? "bg-[#FF6B35] text-white" : "border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA]"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#1A2035] mb-1 block">City</label>
                <input
                  value={profile.city}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#1A2035] mb-1 block">State</label>
                <input
                  value={profile.state}
                  onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#1A2035] mb-1 block">Username</label>
              <input
                value={user.schoolName ?? ""}
                readOnly
                className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl bg-[#F8FAFC] text-[#7A869A] cursor-not-allowed"
              />
              <p className="text-[10px] text-[#7A869A] mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#1A2035] mb-1 block">Website URL</label>
              <input
                value={profile.website}
                onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1A2035] mb-2 block">School Logo</label>
              <div className="border-2 border-dashed border-[#E8EDF5] rounded-xl p-8 text-center hover:border-[#FF6B35] transition-colors cursor-pointer">
                <Upload size={24} className="mx-auto text-[#7A869A] mb-2" />
                <div className="text-sm text-[#7A869A]">Upload Logo</div>
                <div className="text-xs text-[#94A3B8] mt-1">PNG, JPG up to 2MB</div>
              </div>
            </div>

            <Button variant="primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 1 && (
        <div className="max-w-2xl space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#FFF7F4] flex items-center justify-center text-xl">💳</div>
              <div>
                <div className="text-sm font-semibold text-[#1A2035]">Manage Subscription</div>
                <div className="text-xs text-[#7A869A]">Plan details and billing are managed by our team</div>
              </div>
            </div>
            <p className="text-sm text-[#7A869A] mt-3">
              To upgrade, downgrade, or make changes to your subscription, please contact our support team. We&apos;ll get back to you within 24 hours.
            </p>
            <div className="mt-4">
              <Button variant="primary" onClick={() => toast("Opening support...")}>Contact Support</Button>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-[#1A2035] mb-4">Billing History</div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0F4FA]">
                  {["Date", "Plan", "Amount", "Invoice"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-[#7A869A] pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { date: "Jan 1, 2026", plan: "Growth", amount: "₹45,000" },
                  { date: "Jan 1, 2025", plan: "Growth", amount: "₹40,000" },
                  { date: "Jan 1, 2024", plan: "Starter", amount: "₹25,000" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#F0F4FA] last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-[#1A2035]">{row.date}</td>
                    <td className="py-2.5 pr-4 text-xs text-[#7A869A]">{row.plan}</td>
                    <td className="py-2.5 pr-4 text-xs font-medium text-[#1A2035]">{row.amount}</td>
                    <td className="py-2.5">
                      <button className="text-xs text-[#FF6B35] hover:underline" onClick={() => toast("Invoice downloaded")}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {activeTab === 2 && (
        <Card className="max-w-2xl">
          <div className="text-sm font-semibold text-[#1A2035] mb-5">Notification Preferences</div>
          <div className="space-y-4">
            {[
              { key: "lowAttendance", label: "Low attendance alert", desc: "Alert when class attendance drops below threshold" },
              { key: "overdueReminder", label: "Assignment overdue reminder", desc: "Remind teachers about overdue assignments" },
              { key: "parentMessage", label: "Parent message received", desc: "Notify when a parent sends a message" },
              { key: "newTeacher", label: "New teacher joined", desc: "Notify when a new teacher joins" },
              { key: "belowThreshold", label: "Student below 50% threshold", desc: "Alert for at-risk students" },
              { key: "gameSession", label: "Game session started", desc: "Notify when games are being played" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-[#F0F4FA] last:border-0">
                <div>
                  <div className="text-sm font-medium text-[#1A2035]">{label}</div>
                  <div className="text-xs text-[#7A869A]">{desc}</div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${notifSettings[key as keyof typeof notifSettings] ? "bg-[#FF6B35]" : "bg-[#E8EDF5]"}`}
                  onClick={() => toggleNotif(key)}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifSettings[key as keyof typeof notifSettings] ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </div>
            ))}

            <div className="pt-2">
              <label className="text-xs font-medium text-[#1A2035] mb-1 block">
                Alert when attendance below{" "}
                <input
                  value={notifSettings.threshold}
                  onChange={(e) => setNotifSettings((p) => ({ ...p, threshold: e.target.value }))}
                  className="inline w-12 px-1 py-0.5 text-xs border border-[#E8EDF5] rounded-lg focus:outline-none focus:border-[#FF6B35] text-center mx-1"
                />
                %
              </label>
            </div>

            <Button variant="primary" onClick={() => toast.success("Preferences saved")}>Save Preferences</Button>
          </div>
        </Card>
      )}

      {activeTab === 3 && (
        <Card className="max-w-2xl">
          <div className="text-sm font-semibold text-[#1A2035] mb-5">Security Settings</div>
          <div className="space-y-6">
            <div className="p-4 bg-[#F8FAFC] rounded-xl">
              <div className="text-sm font-medium text-[#1A2035] mb-3">Change Password</div>
              <div className="space-y-3">
                <input type="password" placeholder="Current password" className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]" />
                <input type="password" placeholder="New password" className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]" />
                <input type="password" placeholder="Confirm new password" className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35]" />
                <Button variant="primary" onClick={() => toast.success("Password updated")}>Update Password</Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[#F0F4FA]">
              <div>
                <div className="text-sm font-medium text-[#1A2035]">Two-Factor Authentication</div>
                <div className="text-xs text-[#7A869A]">Add an extra layer of security to your account</div>
              </div>
              <div
                className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${twoFactor ? "bg-[#10B981]" : "bg-[#E8EDF5]"}`}
                onClick={() => { setTwoFactor(!twoFactor); toast(twoFactor ? "2FA disabled" : "2FA enabled"); }}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${twoFactor ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-[#1A2035] mb-3">Active Sessions</div>
              <div className="space-y-2">
                {[
                  { device: "Chrome · Web", time: "Today" },
                  { device: "Mobile · App", time: "2 days ago" },
                ].map((session, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl">
                    <div>
                      <div className="text-xs font-medium text-[#1A2035]">{session.device}</div>
                      <div className="text-[10px] text-[#7A869A]">Last active: {session.time}</div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  </div>
                ))}
              </div>
              <Button variant="danger" size="sm" className="mt-3" onClick={() => toast.success("All sessions logged out")}>
                Logout All Devices
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
