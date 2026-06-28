"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCap, Shield, IndianRupee, Star, Clock, Users,
  BookOpen, MapPin, Award, Video, Home, Globe,
  CheckCircle, ArrowRight, ArrowLeft, Send, Pencil,
  AlertCircle, Loader2, ToggleLeft, ToggleRight,
  BadgeCheck, XCircle, FileText, X, Camera, Upload, Trash2,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi",
  "History", "Geography", "Economics", "Political Science",
  "Computer Science", "Accountancy", "Business Studies", "Science",
];
const BOARDS  = ["CBSE", "ICSE", "State Board", "IB", "IGCSE"];
const GRADES  = [
  "Class 1–4 (Primary)", "Class 5–7 (Upper Primary)",
  "Class 8–10 (Secondary)", "Class 11–12 (Sr. Sec.)", "Competitive Exams",
];
const LANGS   = [
  "English", "Hindi", "Tamil", "Telugu", "Malayalam",
  "Kannada", "Marathi", "Bengali", "Gujarati",
];
const DAYS    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day      = typeof DAYS[number];
const SLOTS   = ["6–8 AM","8–10 AM","10–12 PM","12–2 PM","2–4 PM","4–6 PM","6–8 PM","8–10 PM"] as const;
type Slot     = typeof SLOTS[number];
const RATE_PRESETS = [200, 300, 500, 750, 1000, 1500, 2000];
const ID_PROOF_TYPES = ["Aadhaar Card", "PAN Card", "Passport", "Voter ID", "Driving License"];
const WIZARD_STEPS = [
  { id: 1, label: "Personal Info",          short: "Personal" },
  { id: 2, label: "Teaching Details",       short: "Teaching" },
  { id: 3, label: "Schedule & Rates",       short: "Schedule" },
  { id: 4, label: "Verification Docs",      short: "Verify"   },
  { id: 5, label: "Review & Submit",        short: "Review"   },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type TStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

interface TutorProfile {
  id?: string;
  user_id?: string;
  display_name: string;
  tagline: string;
  bio: string;
  qualifications: string;
  experience_years: number;
  phone: string;
  location: string;
  subjects: string[];
  boards: string[];
  grades: string[];
  languages: string[];
  mode: "online" | "offline" | "both";
  hourly_rate: number;
  availability: Partial<Record<Day, Slot[]>>;
  status: TStatus;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  is_active: boolean;
  total_students: number;
  total_sessions: number;
  avg_rating: number;
  // Verification documents
  profile_photo_url?: string | null;
  certificate_urls?: string[];
  id_proof_url?: string | null;
  id_proof_type?: string | null;
}

const EMPTY: TutorProfile = {
  display_name: "", tagline: "", bio: "", qualifications: "",
  experience_years: 1, phone: "", location: "",
  subjects: [], boards: [], grades: [], languages: ["English"],
  mode: "both", hourly_rate: 500, availability: {},
  status: "DRAFT", is_active: false,
  total_students: 0, total_sessions: 0, avg_rating: 0,
  profile_photo_url: null, certificate_urls: [], id_proof_url: null, id_proof_type: null,
};

// ─── Atom components ──────────────────────────────────────────────────────────
function Pill({ label, selected, onClick, color = "#8B5CF6", bg = "#F5F3FF" }: {
  label: string; selected: boolean; onClick: () => void; color?: string; bg?: string;
}) {
  return (
    <button
      type="button" onClick={onClick}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 select-none"
      style={{ background: selected ? bg : "#F8FAFC", borderColor: selected ? color : "#E8EDF5", color: selected ? color : "#94A3B8" }}
    >
      {selected && <CheckCircle size={9} style={{ color }} />}
      {label}
    </button>
  );
}

function FLabel({ text }: { text: string }) {
  return <p className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1.5">{text}</p>;
}

function FInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <FLabel text={label} />
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition-all"
      />
    </div>
  );
}

function FTextarea({ label, value, onChange, placeholder, rows = 4, min = 0 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; min?: number;
}) {
  const tooShort = min > 0 && value.length < min;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <FLabel text={label} />
        <span className={`text-[10px] font-medium ${tooShort ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
          {value.length}{min > 0 ? ` / min ${min}` : ""}
        </span>
      </div>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm text-[#1A2035] placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 resize-none transition-all ${tooShort ? "border-[#FCA5A5] bg-[#FFF5F5]" : "border-[#E8EDF5] bg-[#F8FAFC] focus:border-[#8B5CF6]"}`}
      />
    </div>
  );
}

// ─── Wizard step components ───────────────────────────────────────────────────
function Step1({ p, set }: { p: TutorProfile; set(k: keyof TutorProfile, v: unknown): void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FInput label="Display Name (shown to students)" value={p.display_name} onChange={v => set("display_name", v)} placeholder="e.g. Priya Sharma" />
        <FInput label="One-line Tagline" value={p.tagline} onChange={v => set("tagline", v)} placeholder="e.g. IIT grad · 8 yrs experience" />
      </div>
      <FTextarea
        label="Bio" value={p.bio} onChange={v => set("bio", v)} rows={5} min={80}
        placeholder="Tell students about yourself — your teaching approach, strengths, achievements…"
      />
      <FInput label="Qualifications" value={p.qualifications} onChange={v => set("qualifications", v)} placeholder="e.g. B.Tech IIT Delhi, M.Sc Math, B.Ed" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <FLabel text="Years of Experience" />
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC]">
            <button type="button" onClick={() => set("experience_years", Math.max(0, p.experience_years - 1))} className="w-5 h-5 rounded-full bg-[#E8EDF5] text-[#7A869A] flex items-center justify-center font-bold leading-none hover:bg-[#CBD5E1] transition-colors">−</button>
            <span className="flex-1 text-center text-sm font-bold text-[#1A2035]">{p.experience_years} yr{p.experience_years !== 1 ? "s" : ""}</span>
            <button type="button" onClick={() => set("experience_years", Math.min(40, p.experience_years + 1))} className="w-5 h-5 rounded-full bg-[#E8EDF5] text-[#7A869A] flex items-center justify-center font-bold leading-none hover:bg-[#CBD5E1] transition-colors">+</button>
          </div>
        </div>
        <FInput label="Phone (optional)" value={p.phone} onChange={v => set("phone", v)} placeholder="+91 98765 43210" type="tel" />
        <FInput label="City / Area" value={p.location} onChange={v => set("location", v)} placeholder="Bengaluru, Karnataka" />
      </div>
    </div>
  );
}

function Step2({ p, set, toggle }: {
  p: TutorProfile;
  set(k: keyof TutorProfile, v: unknown): void;
  toggle(k: "subjects" | "boards" | "grades" | "languages", v: string): void;
}) {
  const MODE_CFG = {
    online:  { label: "Online Only",        Icon: Video,  color: "#3B82F6", bg: "#EFF6FF" },
    offline: { label: "In-person Only",     Icon: Home,   color: "#FF6B35", bg: "#FFF7F4" },
    both:    { label: "Online & In-person", Icon: Globe,  color: "#8B5CF6", bg: "#F5F3FF" },
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <FLabel text="Subjects You Teach" />
        <p className="text-[10px] text-[#7A869A] mb-2">Select at least one subject to continue</p>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map(s => <Pill key={s} label={s} selected={p.subjects.includes(s)} onClick={() => toggle("subjects", s)} />)}
        </div>
        {p.subjects.length === 0 && <p className="text-[10px] text-[#EF4444] mt-1.5 font-medium">Required — select at least 1</p>}
      </div>
      <div>
        <FLabel text="Grade Levels" />
        <div className="flex flex-wrap gap-2">
          {GRADES.map(g => <Pill key={g} label={g} selected={p.grades.includes(g)} onClick={() => toggle("grades", g)} color="#10B981" bg="#ECFDF5" />)}
        </div>
      </div>
      <div>
        <FLabel text="Boards Covered" />
        <div className="flex flex-wrap gap-2">
          {BOARDS.map(b => <Pill key={b} label={b} selected={p.boards.includes(b)} onClick={() => toggle("boards", b)} color="#3B82F6" bg="#EFF6FF" />)}
        </div>
      </div>
      <div>
        <FLabel text="Languages of Instruction" />
        <div className="flex flex-wrap gap-2">
          {LANGS.map(l => <Pill key={l} label={l} selected={p.languages.includes(l)} onClick={() => toggle("languages", l)} color="#FF6B35" bg="#FFF7F4" />)}
        </div>
      </div>
      <div>
        <FLabel text="Teaching Mode" />
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(MODE_CFG) as Array<keyof typeof MODE_CFG>).map(m => {
            const { label, Icon, color, bg } = MODE_CFG[m];
            const active = p.mode === m;
            return (
              <button key={m} type="button" onClick={() => set("mode", m)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
                style={{ borderColor: active ? color : "#E8EDF5", background: active ? bg : "#F8FAFC" }}>
                <Icon size={20} style={{ color: active ? color : "#CBD5E1" }} />
                <span className="text-xs font-semibold" style={{ color: active ? color : "#94A3B8" }}>{label}</span>
                {active && <CheckCircle size={12} style={{ color }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step3({ p, set, toggleSlot }: {
  p: TutorProfile;
  set(k: keyof TutorProfile, v: unknown): void;
  toggleSlot(d: Day, s: Slot): void;
}) {
  const totalSlots = (Object.values(p.availability) as Slot[][]).flat().length;
  return (
    <div className="space-y-7">
      <div>
        <FLabel text="Hourly Rate (₹)" />
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#E8EDF5] p-5 space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-[#1A2035]">₹{p.hourly_rate.toLocaleString("en-IN")}</span>
            <span className="text-sm text-[#7A869A] font-medium">per hour</span>
          </div>
          <input
            type="range" min={100} max={5000} step={50} value={p.hourly_rate}
            onChange={e => set("hourly_rate", +e.target.value)}
            className="w-full accent-[#F59E0B] h-2"
          />
          <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-medium">
            <span>₹100</span><span>₹5,000</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] text-[#7A869A] self-center font-medium">Quick pick:</span>
            {RATE_PRESETS.map(r => (
              <button key={r} type="button" onClick={() => set("hourly_rate", r)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all"
                style={{ borderColor: p.hourly_rate === r ? "#F59E0B" : "#E8EDF5", background: p.hourly_rate === r ? "#FFFBEB" : "#F8FAFC", color: p.hourly_rate === r ? "#F59E0B" : "#94A3B8" }}>
                ₹{r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <FLabel text="Weekly Availability" />
          {totalSlots > 0 && (
            <span className="text-[10px] font-bold text-[#10B981]">✓ {totalSlots} slots marked</span>
          )}
        </div>
        <p className="text-[11px] text-[#7A869A] mb-3">Click cells to mark your free slots. Students use this to send booking requests.</p>
        <div className="rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-[11px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E8EDF5]">
                  <th className="text-left font-bold text-[#7A869A] px-3 py-2.5 w-12">Day</th>
                  {SLOTS.map(s => (
                    <th key={s} className="text-center font-semibold text-[#7A869A] px-1 py-2.5 whitespace-nowrap">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, di) => {
                  const daySlots = (p.availability[day] ?? []) as Slot[];
                  return (
                    <tr key={day} className={di % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"}>
                      <td className="px-3 py-1.5 font-bold text-[#1A2035]">{day}</td>
                      {SLOTS.map(slot => {
                        const on = daySlots.includes(slot);
                        return (
                          <td key={slot} className="px-1 py-1.5 text-center">
                            <button
                              type="button" onClick={() => toggleSlot(day, slot)}
                              className="w-full h-7 rounded-lg border-2 transition-all duration-150 flex items-center justify-center"
                              style={{ background: on ? "#8B5CF6" : "transparent", borderColor: on ? "#7C3AED" : "#E8EDF5" }}
                            >
                              {on && <CheckCircle size={11} className="text-white" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Verification Documents ──────────────────────────────────────────
function Step4Docs({
  p, set,
  newPhotoFile, setNewPhotoFile,
  newCertFiles, setNewCertFiles,
  newIdFile, setNewIdFile,
}: {
  p: TutorProfile;
  set(k: keyof TutorProfile, v: unknown): void;
  newPhotoFile: File | null; setNewPhotoFile(f: File | null): void;
  newCertFiles: File[]; setNewCertFiles(fs: File[]): void;
  newIdFile: File | null; setNewIdFile(f: File | null): void;
}) {
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!newPhotoFile) { setPhotoObjectUrl(null); return; }
    const url = URL.createObjectURL(newPhotoFile);
    setPhotoObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newPhotoFile]);

  const photoPreview = photoObjectUrl ?? p.profile_photo_url ?? null;
  const existingCerts = p.certificate_urls ?? [];
  const totalCerts = existingCerts.length + newCertFiles.length;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2 MB"); return; }
    setNewPhotoFile(f);
  }

  function handleCertsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} exceeds 5 MB limit`); return false; }
      return true;
    });
    if (totalCerts + valid.length > 5) { toast.error("Maximum 5 certificates allowed"); return; }
    setNewCertFiles([...newCertFiles, ...valid]);
    e.target.value = "";
  }

  function handleIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB"); return; }
    setNewIdFile(f);
    e.target.value = "";
  }

  return (
    <div className="space-y-7">
      {/* Privacy notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
        <Shield size={14} className="text-[#3B82F6] shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] text-[#1D4ED8] font-semibold mb-0.5">For verification only — never shown to students</p>
          <p className="text-[10px] text-[#3B82F6] leading-relaxed">
            These documents are reviewed solely by the EduBattle CMS admin team to verify your identity and qualifications.
            They are never displayed on your public profile, never shared with schools, and kept strictly confidential.
          </p>
        </div>
      </div>

      {/* ── Profile Photo ── */}
      <div>
        <FLabel text="Profile Photo (optional)" />
        <p className="text-[10px] text-[#7A869A] mb-3">JPG, PNG or WebP · Max 2 MB · Appears on your public tutor card</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#E8EDF5] bg-[#F8FAFC] flex items-center justify-center overflow-hidden shrink-0">
            {photoPreview
              ? <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
              : <Camera size={22} className="text-[#CBD5E1]" />}
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-xs font-semibold text-[#7A869A] hover:bg-white hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-all">
              <Upload size={12} />
              {photoPreview ? "Change Photo" : "Upload Photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
            </label>
            {(newPhotoFile || p.profile_photo_url) && (
              <button type="button"
                onClick={() => { setNewPhotoFile(null); set("profile_photo_url", null); }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[#FCA5A5] text-[#EF4444] text-xs hover:bg-[#FEF2F2] transition-colors">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Certificates ── */}
      <div>
        <FLabel text="Educational Certificates" />
        <p className="text-[10px] text-[#7A869A] mb-3">
          Degree, B.Ed, diplomas, teaching certifications, etc.{" "}
          <span className="font-semibold text-[#EF4444]">At least 1 required for approval.</span>
          <br />PDF or image · Max 5 MB each · Up to 5 files total
        </p>

        {totalCerts > 0 && (
          <div className="space-y-2 mb-3">
            {existingCerts.map((url, i) => (
              <div key={url} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                <FileText size={13} className="text-[#10B981] shrink-0" />
                <span className="text-xs text-[#065F46] flex-1 truncate">{decodeURIComponent(url.split("/").pop() ?? "certificate")}</span>
                <span className="text-[10px] text-[#10B981] font-semibold shrink-0">Uploaded ✓</span>
                <button type="button"
                  onClick={() => set("certificate_urls", existingCerts.filter((_, j) => j !== i))}
                  className="text-[#7A869A] hover:text-[#EF4444] transition-colors">
                  <X size={13} />
                </button>
              </div>
            ))}
            {newCertFiles.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                <FileText size={13} className="text-[#3B82F6] shrink-0" />
                <span className="text-xs text-[#1D4ED8] flex-1 truncate">{f.name}</span>
                <span className="text-[10px] text-[#3B82F6] font-semibold shrink-0">Ready to upload</span>
                <button type="button"
                  onClick={() => setNewCertFiles(newCertFiles.filter((_, j) => j !== i))}
                  className="text-[#7A869A] hover:text-[#EF4444] transition-colors">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {totalCerts < 5 && (
          <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-2 border-dashed border-[#E8EDF5] hover:border-[#8B5CF6] hover:bg-[#F5F3FF] transition-all text-xs font-semibold text-[#94A3B8] hover:text-[#8B5CF6]">
            <Upload size={14} />
            Add Certificate {totalCerts > 0 ? `(${totalCerts}/5)` : ""}
            <input type="file" accept=".pdf,image/*" multiple onChange={handleCertsChange} className="hidden" />
          </label>
        )}

        {totalCerts === 0 && (
          <p className="text-[10px] text-[#EF4444] mt-2 font-medium">⚠ Upload at least 1 certificate before you can submit for approval</p>
        )}
      </div>

      {/* ── Identity Proof ── */}
      <div>
        <FLabel text="Identity Proof" />
        <p className="text-[10px] text-[#7A869A] mb-3">
          Required for anti-fraud verification.{" "}
          <span className="font-semibold text-[#EF4444]">Required before approval.</span>
          <br />PDF or image · Max 5 MB · Seen only by CMS admins, never by students or schools
        </p>

        {/* ID type selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {ID_PROOF_TYPES.map(t => (
            <button key={t} type="button" onClick={() => set("id_proof_type", t)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-left"
              style={{
                borderColor: p.id_proof_type === t ? "#8B5CF6" : "#E8EDF5",
                background:  p.id_proof_type === t ? "#F5F3FF" : "#F8FAFC",
                color:       p.id_proof_type === t ? "#8B5CF6" : "#94A3B8",
              }}>
              {p.id_proof_type === t
                ? <CheckCircle size={11} style={{ color: "#8B5CF6" }} className="shrink-0" />
                : <div className="w-[11px] h-[11px] rounded-full border-2 border-[#E8EDF5] shrink-0" />}
              {t}
            </button>
          ))}
        </div>

        {!p.id_proof_type && (
          <p className="text-[10px] text-[#7A869A]">Select your ID type above, then upload the document.</p>
        )}

        {p.id_proof_type && (
          (newIdFile || p.id_proof_url) ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
              <FileText size={16} className="text-[#10B981] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#065F46] truncate">
                  {newIdFile ? newIdFile.name : decodeURIComponent(p.id_proof_url?.split("/").pop() ?? "id_proof")}
                </div>
                <div className="text-[10px] text-[#10B981]">
                  {p.id_proof_type} · {newIdFile ? "Ready to upload" : "Uploaded ✓"}
                </div>
              </div>
              <button type="button"
                onClick={() => { setNewIdFile(null); set("id_proof_url", null); }}
                className="text-[#7A869A] hover:text-[#EF4444] transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-2 border-dashed border-[#E8EDF5] hover:border-[#8B5CF6] hover:bg-[#F5F3FF] transition-all text-xs font-semibold text-[#94A3B8] hover:text-[#8B5CF6]">
              <Upload size={14} />
              Upload {p.id_proof_type}
              <input type="file" accept=".pdf,image/*" onChange={handleIdChange} className="hidden" />
            </label>
          )
        )}

        {p.id_proof_type && !newIdFile && !p.id_proof_url && (
          <p className="text-[10px] text-[#EF4444] mt-2 font-medium">⚠ Upload your identity proof before submitting</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 5: Review & Submit ──────────────────────────────────────────────────
function Step5Review({
  p, name,
  newPhotoFile, newCertFiles, newIdFile,
}: {
  p: TutorProfile; name: string;
  newPhotoFile: File | null; newCertFiles: File[]; newIdFile: File | null;
}) {
  const initials  = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const modeLabel = { online: "Online Only", offline: "In-person Only", both: "Online & In-person" }[p.mode];
  const totalSlots = (Object.values(p.availability) as Slot[][]).flat().length;
  const totalCerts = (p.certificate_urls?.length ?? 0) + newCertFiles.length;
  const hasId = newIdFile || p.id_proof_url;

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1D4ED8]">
        <strong>Preview:</strong> This is how your profile will look to students once approved. Review carefully before submitting.
      </div>

      {/* Live preview card */}
      <div className="rounded-2xl border-2 border-[#E8EDF5] overflow-hidden shadow-sm">
        <div className="h-14 relative" style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
          <div className="absolute -bottom-5 left-4">
            <div className="w-10 h-10 rounded-xl border-2 border-white bg-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {p.profile_photo_url
                ? <img src={p.profile_photo_url} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
          </div>
        </div>
        <div className="pt-7 px-4 pb-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="text-sm font-bold text-[#1A2035]">{p.display_name || name}</h3>
              {p.tagline && <p className="text-[10px] text-[#7A869A]">{p.tagline}</p>}
            </div>
            <div className="text-right shrink-0">
              <div className="text-base font-bold text-[#F59E0B]">₹{p.hourly_rate}<span className="text-[10px] font-normal text-[#7A869A]">/hr</span></div>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 my-2 text-[10px] text-[#7A869A]">
            <span className="flex items-center gap-1"><Award size={10} /> {p.experience_years} yr{p.experience_years !== 1 ? "s" : ""} exp</span>
            <span className="flex items-center gap-1"><Globe size={10} /> {modeLabel}</span>
            {p.location && <span className="flex items-center gap-1"><MapPin size={10} /> {p.location}</span>}
            {totalSlots > 0 && <span className="flex items-center gap-1"><Clock size={10} /> {totalSlots} slots/week</span>}
          </div>
          {p.bio && <p className="text-xs text-[#7A869A] line-clamp-2 mb-2">{p.bio}</p>}
          {p.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.subjects.slice(0, 5).map(s => <span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6]">{s}</span>)}
              {p.subjects.length > 5 && <span className="text-[9px] text-[#7A869A]">+{p.subjects.length - 5}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Detail rows */}
      <div className="space-y-2">
        {[
          { label: "Qualifications", value: p.qualifications || "—" },
          { label: "Boards",         value: p.boards.join(", ") || "—" },
          { label: "Grade Levels",   value: p.grades.join(", ") || "—" },
          { label: "Languages",      value: p.languages.join(", ") || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start gap-3 px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E8EDF5]">
            <span className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider w-28 shrink-0 pt-px">{label}</span>
            <span className="text-xs text-[#1A2035]">{value}</span>
          </div>
        ))}
      </div>

      {/* Verification docs checklist */}
      <div className="rounded-xl border border-[#E8EDF5] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5]">
          <span className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">Verification Documents</span>
        </div>
        <div className="divide-y divide-[#F0F4FA]">
          {[
            { label: "Profile Photo",       ok: !!(newPhotoFile || p.profile_photo_url), optional: true  },
            { label: "Certificates",        ok: totalCerts > 0,                          optional: false, detail: totalCerts > 0 ? `${totalCerts} file${totalCerts > 1 ? "s" : ""}` : undefined },
            { label: "Identity Proof",      ok: !!hasId,                                 optional: false, detail: p.id_proof_type || undefined },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
              {row.ok
                ? <CheckCircle size={14} className="text-[#10B981] shrink-0" />
                : row.optional
                  ? <div className="w-3.5 h-3.5 rounded-full border-2 border-[#E8EDF5] shrink-0" />
                  : <AlertCircle size={14} className="text-[#EF4444] shrink-0" />}
              <span className="text-xs text-[#1A2035] flex-1">{row.label}</span>
              {row.detail && <span className="text-[10px] text-[#7A869A]">{row.detail}</span>}
              {!row.ok && !row.optional && <span className="text-[10px] text-[#EF4444] font-semibold">Required</span>}
              {!row.ok && row.optional && <span className="text-[10px] text-[#94A3B8]">Optional</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
        <Shield size={13} className="text-[#10B981] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#065F46] leading-relaxed">
          <strong>Privacy:</strong> Your school admin cannot see this profile. Only students on the marketplace will see it after CMS approval. Your identity documents are for admin verification only.
        </p>
      </div>
    </div>
  );
}

// ─── Landing screen ───────────────────────────────────────────────────────────
function LandingScreen({ firstName, onStart }: { firstName: string; onStart(): void }) {
  return (
    <div className="max-w-xl mx-auto py-10 px-4 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-[#F59E0B] bg-[#FFFBEB] border border-[#FDE68A] mb-4">
          <Shield size={10} /> Private from school admin
        </div>
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
          <GraduationCap size={30} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-[#1A2035] mb-2">Tutor on your own terms, {firstName}</h1>
        <p className="text-sm text-[#7A869A] max-w-sm mx-auto">Set up a personal tutor profile. Students find and book you directly — your school admin sees none of this.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { Icon: IndianRupee, title: "Extra Income",    desc: "Set your own rate & earn outside school hours.", color: "#10B981", bg: "#ECFDF5" },
          { Icon: Shield,      title: "100% Private",    desc: "Completely hidden from your school admin.",      color: "#3B82F6", bg: "#EFF6FF" },
          { Icon: Star,        title: "Grow Reputation", desc: "Earn ratings & build a student following.",       color: "#F59E0B", bg: "#FFFBEB" },
        ].map(b => (
          <div key={b.title} className="bg-white rounded-2xl border border-[#E8EDF5] p-4 text-center">
            <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: b.bg }}>
              <b.Icon size={16} style={{ color: b.color }} />
            </div>
            <div className="text-[11px] font-bold text-[#1A2035] mb-0.5">{b.title}</div>
            <div className="text-[10px] text-[#7A869A]">{b.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-5 mb-6">
        <p className="text-xs font-bold text-[#1A2035] mb-3">How it works</p>
        <div className="space-y-3">
          {[
            { n: "1", label: "Build your profile",      desc: "Add subjects, schedule, rate & upload verification docs (5 steps)" },
            { n: "2", label: "Submit for approval",      desc: "CMS admin reviews your application in 24–48 hours" },
            { n: "3", label: "Go live & start earning",  desc: "Toggle active anytime — students book you on EduBattle" },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>{s.n}</div>
              <div>
                <div className="text-xs font-semibold text-[#1A2035]">{s.label}</div>
                <div className="text-[10px] text-[#7A869A]">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}
      >
        Set Up My Tutor Profile <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ─── Status view ──────────────────────────────────────────────────────────────
function StatusView({
  profile, name, onEdit, onToggleActive,
}: {
  profile: TutorProfile; name: string;
  onEdit(): void; onToggleActive(): void;
}) {
  const STATUS_CFG = {
    PENDING: {
      grad: "linear-gradient(135deg,#FFFBEB,#FFF7ED)", border: "#FDE68A",
      Icon: Clock, iconColor: "#F59E0B",
      title: "Application Under Review",
      desc: "Our CMS team will review your profile within 24–48 hours. You'll be notified once a decision is made.",
      badge: { bg: "#FFFBEB", color: "#F59E0B", label: "PENDING REVIEW" },
    },
    APPROVED: {
      grad: "linear-gradient(135deg,#ECFDF5,#F0FDF4)", border: "#A7F3D0",
      Icon: BadgeCheck, iconColor: "#10B981",
      title: "Profile Approved — You're Live!",
      desc: "Your tutor profile is approved. Toggle the switch to start accepting student booking requests.",
      badge: { bg: "#ECFDF5", color: "#10B981", label: "APPROVED" },
    },
    REJECTED: {
      grad: "linear-gradient(135deg,#FEF2F2,#FFF5F5)", border: "#FECACA",
      Icon: XCircle, iconColor: "#EF4444",
      title: "Application Not Approved",
      desc: "Review the feedback below, update your profile, and resubmit for approval.",
      badge: { bg: "#FEF2F2", color: "#EF4444", label: "NOT APPROVED" },
    },
    SUSPENDED: {
      grad: "linear-gradient(135deg,#F8FAFC,#F0F4FA)", border: "#CBD5E1",
      Icon: AlertCircle, iconColor: "#7A869A",
      title: "Account Suspended",
      desc: "Your tutor account has been suspended. Contact EduBattle support for assistance.",
      badge: { bg: "#F0F4FA", color: "#7A869A", label: "SUSPENDED" },
    },
    DRAFT: {
      grad: "linear-gradient(135deg,#F5F3FF,#EDE9FE)", border: "#DDD6FE",
      Icon: FileText, iconColor: "#8B5CF6",
      title: "Draft Saved",
      desc: "Your profile is saved but not submitted yet. Complete all steps and submit for approval.",
      badge: { bg: "#F5F3FF", color: "#8B5CF6", label: "DRAFT" },
    },
  } as const;

  const cfg = STATUS_CFG[profile.status] ?? STATUS_CFG.DRAFT;
  const { Icon } = cfg;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 animate-fadeIn pb-8">
      {/* Status banner */}
      <div className="rounded-2xl border p-5" style={{ background: cfg.grad, borderColor: cfg.border }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.iconColor + "18" }}>
              <Icon size={20} style={{ color: cfg.iconColor }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-bold text-[#1A2035]">{cfg.title}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.badge.bg, color: cfg.badge.color }}>{cfg.badge.label}</span>
              </div>
              <p className="text-xs text-[#7A869A]">{cfg.desc}</p>

              {profile.status === "PENDING" && (
                <div className="flex items-center gap-0 mt-3">
                  {[
                    { label: "Submitted",    done: true,  active: false },
                    { label: "Under Review", done: false, active: true  },
                    { label: "Decision",     done: false, active: false },
                  ].map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${s.done ? "bg-[#10B981] text-white" : s.active ? "bg-[#F59E0B] text-white" : "bg-[#E8EDF5] text-[#94A3B8]"}`}>
                          {s.done ? "✓" : i + 1}
                        </div>
                        <span className="text-[9px] font-semibold mt-0.5 whitespace-nowrap" style={{ color: s.done ? "#10B981" : s.active ? "#F59E0B" : "#94A3B8" }}>{s.label}</span>
                      </div>
                      {i < 2 && <div className="flex-1 h-0.5 mx-1 mb-3" style={{ background: s.done ? "#10B981" : "#E8EDF5" }} />}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {profile.status === "REJECTED" && profile.rejection_reason && (
                <div className="mt-3 px-3 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                  <div className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider mb-1">Reviewer Feedback</div>
                  <p className="text-xs text-[#EF4444]">{profile.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {profile.status === "APPROVED" && (
              <div className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-1.5 border" style={{ borderColor: cfg.border }}>
                <span className="text-xs font-semibold text-[#1A2035]">{profile.is_active ? "Accepting students" : "Not accepting"}</span>
                <button type="button" onClick={onToggleActive}>
                  {profile.is_active
                    ? <ToggleRight size={28} className="text-[#10B981]" />
                    : <ToggleLeft  size={28} className="text-[#CBD5E1]" />}
                </button>
              </div>
            )}
            {(profile.status === "REJECTED" || profile.status === "APPROVED" || profile.status === "DRAFT") && (
              <button onClick={onEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
                <Pencil size={12} />
                {profile.status === "REJECTED" ? "Edit & Resubmit" : "Edit Profile"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile summary grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="h-12 relative" style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
            <div className="absolute -bottom-4 left-4">
              <div className="w-9 h-9 rounded-xl border-2 border-white bg-[#8B5CF6] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                {profile.profile_photo_url
                  ? <img src={profile.profile_photo_url} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
            </div>
          </div>
          <div className="pt-6 px-4 pb-4">
            <div className="font-bold text-sm text-[#1A2035] truncate">{profile.display_name || name}</div>
            {profile.tagline && <div className="text-[10px] text-[#7A869A] mb-2 truncate">{profile.tagline}</div>}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#7A869A] mb-3">
              <span>₹{profile.hourly_rate}/hr</span>
              <span>{profile.experience_years} yr exp</span>
              {profile.location && <span>{profile.location}</span>}
            </div>
            {profile.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profile.subjects.slice(0, 3).map(s => <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6]">{s}</span>)}
                {profile.subjects.length > 3 && <span className="text-[9px] text-[#7A869A]">+{profile.subjects.length - 3}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Hourly Rate", value: `₹${profile.hourly_rate}`,   color: "#F59E0B", bg: "#FFFBEB", Icon: IndianRupee },
            { label: "Experience",  value: `${profile.experience_years} yr${profile.experience_years !== 1 ? "s" : ""}`, color: "#8B5CF6", bg: "#F5F3FF", Icon: Award },
            { label: "Subjects",    value: profile.subjects.length,       color: "#3B82F6", bg: "#EFF6FF", Icon: BookOpen },
            { label: "Students",    value: profile.total_students ?? 0,   color: "#10B981", bg: "#ECFDF5", Icon: Users },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E8EDF5] p-4 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg }}>
                <s.Icon size={14} style={{ color: s.color }} />
              </div>
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-[#7A869A]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {(profile.bio || profile.qualifications) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.bio && (
            <div className="bg-white rounded-2xl border border-[#E8EDF5] p-4">
              <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Bio</div>
              <p className="text-xs text-[#1A2035] leading-relaxed">{profile.bio}</p>
            </div>
          )}
          {profile.qualifications && (
            <div className="bg-white rounded-2xl border border-[#E8EDF5] p-4">
              <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">Qualifications</div>
              <p className="text-xs text-[#1A2035] leading-relaxed">{profile.qualifications}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Subjects",  items: profile.subjects,  color: "#3B82F6", bg: "#EFF6FF" },
          { label: "Grades",    items: profile.grades,    color: "#10B981", bg: "#ECFDF5" },
          { label: "Boards",    items: profile.boards,    color: "#8B5CF6", bg: "#F5F3FF" },
          { label: "Languages", items: profile.languages, color: "#FF6B35", bg: "#FFF7F4" },
        ].map(sec => (
          <div key={sec.label} className="bg-white rounded-2xl border border-[#E8EDF5] p-3">
            <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-2">{sec.label}</div>
            <div className="flex flex-wrap gap-1">
              {sec.items.length > 0
                ? sec.items.map(i => <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: sec.bg, color: sec.color }}>{i}</span>)
                : <span className="text-[10px] text-[#CBD5E1]">None</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeacherTutorPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [profile, setProfile]   = useState<TutorProfile>(EMPTY);
  const [view, setView]         = useState<"loading" | "landing" | "wizard" | "status">("loading");
  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Document file state (local — not persisted until save)
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newCertFiles, setNewCertFiles] = useState<File[]>([]);
  const [newIdFile,    setNewIdFile]    = useState<File | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function setField<K extends keyof TutorProfile>(key: K, value: TutorProfile[K]) {
    setProfile(p => ({ ...p, [key]: value }));
  }
  function toggleArr(key: "subjects" | "boards" | "grades" | "languages", val: string) {
    setProfile(p => {
      const arr = p[key] as string[];
      return { ...p, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  }
  function toggleSlot(day: Day, slot: Slot) {
    setProfile(p => {
      const cur = (p.availability[day] ?? []) as Slot[];
      return { ...p, availability: { ...p.availability, [day]: cur.includes(slot) ? cur.filter(s => s !== slot) : [...cur, slot] } };
    });
  }

  // ── Load ────────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async (userId: string, userName: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Tutor profile load error:", error);
      // Table doesn't exist yet or RLS issue — start fresh
      setProfile(p => ({ ...p, display_name: userName }));
      setView("landing");
      return;
    }
    if (!data) {
      setProfile(p => ({ ...p, display_name: userName }));
      setView("landing");
    } else {
      setProfile({
        ...EMPTY, ...data,
        subjects:          data.subjects          ?? [],
        boards:            data.boards            ?? [],
        grades:            data.grades            ?? [],
        languages:         data.languages         ?? ["English"],
        availability:      data.availability      ?? {},
        certificate_urls:  data.certificate_urls  ?? [],
        profile_photo_url: data.profile_photo_url ?? null,
        id_proof_url:      data.id_proof_url      ?? null,
        id_proof_type:     data.id_proof_type     ?? null,
      });
      setView(data.status === "DRAFT" ? "wizard" : "status");
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) loadProfile(user.id, user.name ?? "Teacher");
  }, [user, userLoading, loadProfile]);

  // ── Validation per step ──────────────────────────────────────────────────
  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!profile.display_name.trim())   return "Please enter your display name.";
      if (profile.bio.length < 80)        return "Bio must be at least 80 characters.";
      if (!profile.qualifications.trim()) return "Please add your qualifications.";
    }
    if (s === 2) {
      if (profile.subjects.length === 0) return "Please select at least one subject.";
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep(s => Math.min(WIZARD_STEPS.length, s + 1));
  }

  // ── File upload helpers ──────────────────────────────────────────────────
  async function uploadFile(supabase: ReturnType<typeof createClient>, path: string, file: File): Promise<string | null> {
    const { error } = await supabase.storage
      .from("tutor-docs")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      console.warn(`Upload failed [${path}]:`, error.message);
      return null;
    }
    return supabase.storage.from("tutor-docs").getPublicUrl(path).data.publicUrl;
  }

  // ── Persist ──────────────────────────────────────────────────────────────
  function buildPayload(
    userId: string,
    status: TStatus,
    docs: { photoUrl: string | null; certUrls: string[]; idUrl: string | null },
  ) {
    return {
      user_id:           userId,
      display_name:      profile.display_name,
      tagline:           profile.tagline,
      bio:               profile.bio,
      qualifications:    profile.qualifications,
      experience_years:  profile.experience_years,
      phone:             profile.phone,
      location:          profile.location,
      subjects:          profile.subjects,
      boards:            profile.boards,
      grades:            profile.grades,
      languages:         profile.languages,
      mode:              profile.mode,
      hourly_rate:       profile.hourly_rate,
      availability:      profile.availability,
      status,
      profile_photo_url: docs.photoUrl,
      certificate_urls:  docs.certUrls,
      id_proof_url:      docs.idUrl,
      id_proof_type:     profile.id_proof_type ?? null,
      submitted_at:      status === "PENDING"
        ? (profile.submitted_at ?? new Date().toISOString())
        : profile.submitted_at,
      updated_at: new Date().toISOString(),
    };
  }

  async function persist(status: TStatus, successMsg: string): Promise<boolean> {
    if (!user?.id) return false;
    const supabase = createClient();

    // ── Upload new files to Supabase Storage ──
    let photoUrl = profile.profile_photo_url ?? null;
    let certUrls = [...(profile.certificate_urls ?? [])];
    let idUrl    = profile.id_proof_url ?? null;

    try {
      if (newPhotoFile) {
        const ext  = newPhotoFile.name.split(".").pop() ?? "jpg";
        const url  = await uploadFile(supabase, `${user.id}/profile.${ext}`, newPhotoFile);
        if (url) { photoUrl = url; setNewPhotoFile(null); }
      }

      for (const file of newCertFiles) {
        const ext = file.name.split(".").pop() ?? "pdf";
        const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const url = await uploadFile(supabase, `${user.id}/cert_${uid}.${ext}`, file);
        if (url) certUrls.push(url);
      }
      if (newCertFiles.length > 0) setNewCertFiles([]);

      if (newIdFile) {
        const ext = newIdFile.name.split(".").pop() ?? "pdf";
        const url = await uploadFile(supabase, `${user.id}/id_proof.${ext}`, newIdFile);
        if (url) { idUrl = url; setNewIdFile(null); }
      }
    } catch (storageErr) {
      // Storage bucket may not exist yet — allow save to continue without blocking
      console.warn("Storage not available:", storageErr);
      toast("Documents will be uploaded once storage is configured.", { icon: "ℹ️" });
    }

    // ── Save to database ──
    const payload = buildPayload(user.id, status, { photoUrl, certUrls, idUrl });
    const { error } = profile.id
      ? await supabase.from("tutor_profiles").update(payload).eq("id", profile.id)
      : await supabase.from("tutor_profiles").insert({ ...payload, created_at: new Date().toISOString() });

    if (error) {
      console.error("Tutor profile save error:", error);
      if (error.code === "42P01") {
        toast.error("Table not found. Run the tutor_profiles migration first.");
      } else if (error.code === "23505") {
        toast.error("A profile already exists. Try refreshing the page.");
      } else {
        toast.error(error.message || "Could not save. Please try again.");
      }
      return false;
    }

    // Update local profile with saved doc URLs
    setProfile(p => ({ ...p, profile_photo_url: photoUrl, certificate_urls: certUrls, id_proof_url: idUrl }));
    toast.success(successMsg);
    return true;
  }

  async function handleSaveDraft() {
    if (!profile.display_name.trim()) { toast.error("Enter your display name first."); return; }
    setSaving(true);
    const ok = await persist("DRAFT", "Draft saved!");
    setSaving(false);
    if (ok && user) loadProfile(user.id, user.name ?? "Teacher");
  }

  async function handleSubmit() {
    const err = validateStep(1) || validateStep(2);
    if (err) { toast.error(err); return; }

    const totalCerts = (profile.certificate_urls?.length ?? 0) + newCertFiles.length;
    const hasId      = newIdFile || profile.id_proof_url;

    if (totalCerts === 0) {
      toast.error("Upload at least 1 certificate before submitting.");
      setStep(4);
      return;
    }
    if (!hasId) {
      toast.error("Upload your identity proof before submitting.");
      setStep(4);
      return;
    }
    if (!profile.id_proof_type) {
      toast.error("Select your ID proof type on step 4.");
      setStep(4);
      return;
    }

    setSubmitting(true);
    const ok = await persist("PENDING", "Application submitted! We'll review within 24–48 hrs. 🎉");
    setSubmitting(false);
    if (ok && user) loadProfile(user.id, user.name ?? "Teacher");
  }

  async function handleToggleActive() {
    if (!profile.id) return;
    const next = !profile.is_active;
    setProfile(p => ({ ...p, is_active: next }));
    await createClient().from("tutor_profiles").update({ is_active: next }).eq("id", profile.id);
    toast.success(next ? "Now accepting students!" : "Stopped accepting new bookings.");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const name      = user?.name ?? "Teacher";
  const firstName = name.split(" ")[0];

  if (view === "loading" || userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "landing") {
    return (
      <>
        <Toaster position="top-right" />
        <LandingScreen firstName={firstName} onStart={() => { setStep(1); setView("wizard"); }} />
      </>
    );
  }

  if (view === "status") {
    return (
      <>
        <Toaster position="top-right" />
        <StatusView
          profile={profile} name={name}
          onEdit={() => { setStep(1); setView("wizard"); }}
          onToggleActive={handleToggleActive}
        />
      </>
    );
  }

  // ── Wizard view ────────────────────────────────────────────────────────────
  const totalSteps = WIZARD_STEPS.length;

  return (
    <div className="max-w-3xl mx-auto pb-10 animate-fadeIn">
      <Toaster position="top-right" />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#1A2035]">
            {profile.id ? "Edit Tutor Profile" : "Set Up Tutor Profile"}
          </h1>
          <p className="text-xs text-[#7A869A]">Step {step} of {totalSteps}</p>
        </div>
        <button onClick={handleSaveDraft} disabled={saving}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#7A869A] hover:text-[#1A2035] transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save draft"}
        </button>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center mb-6">
        {WIZARD_STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center">
              <button
                onClick={() => { if (s.id < step) setStep(s.id); }}
                disabled={s.id > step}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: s.id < step ? "#10B981" : s.id === step ? "#F59E0B" : "#E8EDF5",
                  color:      s.id <= step ? "white" : "#94A3B8",
                  cursor:     s.id < step ? "pointer" : "default",
                }}
              >
                {s.id < step ? <CheckCircle size={14} /> : s.id}
              </button>
              <span className="text-[9px] font-semibold mt-1 whitespace-nowrap"
                style={{ color: s.id === step ? "#F59E0B" : s.id < step ? "#10B981" : "#94A3B8" }}>
                {s.short}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className="flex-1 h-0.5 mx-1 mb-4 transition-colors duration-300"
                style={{ background: s.id < step ? "#10B981" : "#E8EDF5" }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step card */}
      <div className="bg-white rounded-2xl border border-[#E8EDF5] p-6 mb-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#1A2035] mb-5 pb-3 border-b border-[#F0F4FA]">
          {WIZARD_STEPS[step - 1].label}
        </h2>
        {step === 1 && <Step1 p={profile} set={setField} />}
        {step === 2 && <Step2 p={profile} set={setField} toggle={toggleArr} />}
        {step === 3 && <Step3 p={profile} set={setField} toggleSlot={toggleSlot} />}
        {step === 4 && (
          <Step4Docs
            p={profile} set={setField}
            newPhotoFile={newPhotoFile} setNewPhotoFile={setNewPhotoFile}
            newCertFiles={newCertFiles} setNewCertFiles={setNewCertFiles}
            newIdFile={newIdFile}       setNewIdFile={setNewIdFile}
          />
        )}
        {step === 5 && (
          <Step5Review
            p={profile} name={name}
            newPhotoFile={newPhotoFile}
            newCertFiles={newCertFiles}
            newIdFile={newIdFile}
          />
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => step === 1 ? setView(profile.id ? "status" : "landing") : setStep(s => s - 1)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E8EDF5] text-sm font-semibold text-[#7A869A] hover:bg-[#F8FAFC] transition-colors"
        >
          <ArrowLeft size={14} /> {step === 1 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-2">
          {step < totalSteps && (
            <button onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#F59E0B,#FF6B35)" }}>
              Next <ArrowRight size={14} />
            </button>
          )}
          {step === totalSteps && (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? "Submitting…" : "Submit for Approval"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
