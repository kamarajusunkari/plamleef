"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Save, User, Target } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const EXAM_TYPES = ["SSC","RRB","UPSC","BANK_PO","NDA","CTET","STATE_PSC","GENERAL"];
const SUBJECTS   = ["Mathematics","English","Reasoning","General Awareness","Science","History","Geography","Polity","Economics","Computer"];

interface Profile {
  id: string; name: string; email: string; phone: string | null;
  exam_targets: string[]; subjects: string[]; bio: string | null;
}

export default function AspirantSettingsPage() {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [form, setForm]         = useState({ name:"", phone:"", bio:"", exam_targets:[] as string[], subjects:[] as string[] });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("aspirant_profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setProfile(data as Profile);
        setForm({ name: data.name, phone: data.phone ?? "", bio: data.bio ?? "",
          exam_targets: data.exam_targets ?? [], subjects: data.subjects ?? [] });
      } else {
        // Auto-create profile
        const { data: userData } = await supabase.from("users").select("name, email").eq("id", user.id).single();
        const defaults = { user_id: user.id, name: userData?.name ?? "", email: userData?.email ?? user.email ?? "",
          credit_balance: 10, exam_targets: [], subjects: [] };
        const { data: newP } = await supabase.from("aspirant_profiles").insert(defaults).select().single();
        if (newP) { setProfile(newP as Profile); setForm({ name: newP.name, phone:"", bio:"", exam_targets:[], subjects:[] }); }
        // Welcome bonus transaction
        if (newP) {
          await supabase.from("credit_transactions").insert({
            aspirant_id: newP.id, amount: 10, type: "WELCOME_BONUS", description: "Welcome to EduBattle Aspirant Platform!",
          });
        }
      }
      setLoading(false);
    });
  }, []);

  function toggleArr(key: "exam_targets" | "subjects", val: string) {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x: string) => x !== val) : [...f[key], val],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { error } = await createClient().from("aspirant_profiles").update({
      name: form.name.trim(), phone: form.phone.trim() || null,
      bio: form.bio.trim() || null, exam_targets: form.exam_targets, subjects: form.subjects,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error("Save failed"); return; }
    toast.success("Profile saved!");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F59E0B]"/></div>
  );

  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Profile Settings</h1>
        <p className="text-sm text-[#7A869A]">Manage your aspirant profile and exam targets</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1A2035] mb-2">
            <User size={15} className="text-[#F59E0B]"/> Basic Information
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel" placeholder="+91 9876543210"
                className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B]"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Email</label>
            <input value={profile?.email ?? ""} readOnly
              className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F0F4FA] text-sm text-[#7A869A]"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3} placeholder="Tell us about yourself, your preparation journey…"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#F59E0B] resize-none"/>
          </div>
        </div>

        {/* Exam targets */}
        <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1A2035]">
            <Target size={15} className="text-[#F59E0B]"/> Exam Targets
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAM_TYPES.map(e => (
              <button key={e} type="button" onClick={() => toggleArr("exam_targets", e)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all ${form.exam_targets.includes(e) ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-[#7A869A] border-[#E8EDF5]"}`}>
                {e.replace("_"," ")}
              </button>
            ))}
          </div>
          <div>
            <div className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5">Strong Subjects</div>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button key={s} type="button" onClick={() => toggleArr("subjects", s)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all ${form.subjects.includes(s) ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "bg-white text-[#7A869A] border-[#E8EDF5]"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-[#F59E0B] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#D97706] disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
          Save Profile
        </button>
      </form>
    </div>
  );
}
