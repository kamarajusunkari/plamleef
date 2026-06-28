"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

async function fetchChild(parentUserId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select(`id, user_id, school_id,
      user:user_id ( id, name, email ),
      student_records ( id, class_id, is_current, classes:class_id ( name, section ) ),
      student_xp ( total_xp )`)
    .eq("parent_user_id", parentUserId)
    .maybeSingle();
  return data;
}

interface School {
  display_name: string | null;
  board: string | null;
  city: string | null;
  state: string | null;
}

export default function ParentSettingsPage() {
  const { user, loading: userLoading } = useCurrentUser();

  const [childName, setChildName] = useState<string>("");
  const [childClass, setChildClass] = useState<string>("");
  const [childSchoolId, setChildSchoolId] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [parentName, setParentName] = useState<string>("");
  const [savingName, setSavingName] = useState(false);
  const [loading, setLoading] = useState(true);

  const [notifReports,     setNotifReports]     = useState(true);
  const [notifAttendance,  setNotifAttendance]   = useState(true);
  const [notifGames,       setNotifGames]        = useState(false);
  const [notifMessages,    setNotifMessages]     = useState(true);

  const toggles = [
    { label: "Weekly Reports",      sub: "Receive your child's weekly progress report every Sunday",          value: notifReports,    setter: setNotifReports },
    { label: "Attendance Alerts",   sub: "When your child is marked absent or late",                          value: notifAttendance, setter: setNotifAttendance },
    { label: "Game Achievements",   sub: "When your child earns a new badge or wins a major game",            value: notifGames,      setter: setNotifGames },
    { label: "Teacher Messages",    sub: "Instant alert for new messages from teachers",                      value: notifMessages,   setter: setNotifMessages },
  ];

  useEffect(() => {
    if (userLoading || !user) return;
    setParentName(user.name ?? "");
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const child = await fetchChild(user.id);
      if (child) {
        const name = (child.user as { name?: string } | null)?.name ?? "";
        setChildName(name);
        setChildSchoolId(child.school_id ?? null);

        const records: { id: string; is_current: boolean; classes?: { name: string; section: string } | null }[] = Array.isArray(child.student_records)
          ? child.student_records as unknown as { id: string; is_current: boolean; classes?: { name: string; section: string } | null }[]
          : [];
        const currentRecord = records.find((r) => r.is_current);
        if (currentRecord?.classes) {
          setChildClass(`${currentRecord.classes.name}-${currentRecord.classes.section}`);
        }

        if (child.school_id) {
          const { data: schoolData } = await supabase
            .from("schools")
            .select("display_name, board, city, state")
            .eq("id", child.school_id)
            .maybeSingle();
          setSchool(schoolData as School | null);
        }
      }
      setLoading(false);
    })();
  }, [user, userLoading]);

  const handleSaveName = async () => {
    if (!user || !parentName.trim()) return;
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase.from("users").update({ name: parentName.trim() }).eq("id", user.id);
    setSavingName(false);
    if (error) {
      toast.error("Failed to update name");
    } else {
      toast.success("Name updated successfully");
    }
  };

  const initials = parentName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "P";

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Settings</h1>
        <p className="text-sm text-[#7A869A]">Manage your parent account preferences</p>
      </div>

      {/* Parent profile */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-[#10B981] shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-base font-bold text-[#1A2035]">{user?.name}</div>
            <div className="text-sm text-[#7A869A]">Parent of {childName || "your child"}</div>
            <div className="text-xs text-[#7A869A]">{user?.email}</div>
          </div>
        </div>

        {/* Editable name */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#1A2035] mb-1 block">Display Name</label>
            <div className="flex gap-2">
              <input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#10B981] text-[#1A2035]"
                placeholder="Your name"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-4 py-2 bg-[#10B981] text-white text-sm font-semibold rounded-xl hover:bg-[#059669] transition-colors disabled:opacity-50"
              >
                {savingName ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#7A869A] mb-1 block">Email (read-only)</label>
            <div className="px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl text-[#7A869A] bg-[#F8FAFC]">
              {user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Child info */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">Child Information</div>
        {childName ? (
          <>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-[#10B981]">
                {childName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1A2035]">{childName}</div>
                <div className="text-xs text-[#7A869A]">{childClass || "—"}</div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { label: "Class",   value: childClass || "—" },
                { label: "School",  value: school?.display_name ?? "—" },
                { label: "Board",   value: school?.board ?? "—" },
                { label: "City",    value: school?.city ?? "—" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between py-2 border-b border-[#F0F4FA] last:border-0">
                  <span className="text-[#7A869A]">{s.label}</span>
                  <span className="font-semibold text-[#1A2035]">{s.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-[#7A869A] text-center py-4">No child linked to your account.</div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
        <div className="text-sm font-bold text-[#1A2035] mb-4">Notifications</div>
        <div className="space-y-4">
          {toggles.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1A2035]">{item.label}</div>
                <div className="text-xs text-[#7A869A]">{item.sub}</div>
              </div>
              <button
                onClick={() => { item.setter(!item.value); toast.success(`${item.label} ${!item.value ? "enabled" : "disabled"}`); }}
                className="w-11 h-6 rounded-full transition-all duration-200 relative shrink-0"
                style={{ background: item.value ? "#10B981" : "#E8EDF5" }}
              >
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: item.value ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* School info */}
      {school && (
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF5]">
          <div className="text-sm font-bold text-[#1A2035] mb-3">School Information</div>
          <div className="space-y-1.5 text-xs">
            {[
              { label: "Name",  value: school.display_name ?? "—" },
              { label: "Board", value: school.board ?? "—" },
              { label: "City",  value: school.city ?? "—" },
              { label: "State", value: school.state ?? "—" },
            ].map((s) => (
              <div key={s.label} className="flex gap-3 py-1.5 border-b border-[#F0F4FA] last:border-0">
                <span className="text-[#7A869A] w-16 shrink-0">{s.label}</span>
                <span className="font-medium text-[#1A2035]">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
