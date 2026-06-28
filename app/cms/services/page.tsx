"use client";
import React, { useState, useEffect } from "react";
import {
  Globe, BarChart2, FileText, Star, Image, ChevronDown,
  Loader2, Phone, Clock, CheckCircle, AlertCircle, User2,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface Inquiry {
  id: string; school_id: string | null; school_name: string;
  contact_name: string; contact_phone: string; contact_email: string | null;
  service_type: string; description: string; budget_range: string | null;
  timeline: string | null; status: string; internal_notes: string | null;
  assigned_to: string | null; created_at: string;
}

const SERVICE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  WEBSITE:           { label:"Website",        icon:<Globe size={14}/>,      color:"#3B82F6", bg:"#EFF6FF" },
  DIGITAL_MARKETING: { label:"Dig. Marketing", icon:<BarChart2 size={14}/>,  color:"#10B981", bg:"#ECFDF5" },
  PPT_DESIGN:        { label:"Presentation",   icon:<FileText size={14}/>,   color:"#8B5CF6", bg:"#F5F3FF" },
  POSTER_DESIGN:     { label:"Poster/Banner",  icon:<Image size={14}/>,      color:"#FF6B35", bg:"#FFF7F4" },
  LOGO:              { label:"Logo Design",    icon:<Star size={14}/>,       color:"#F59E0B", bg:"#FFFBEB" },
  CONTENT_WRITING:   { label:"Content",        icon:<FileText size={14}/>,   color:"#EC4899", bg:"#FDF2F8" },
  OTHER:             { label:"Other",          icon:<CheckCircle size={14}/>,color:"#7A869A", bg:"#F0F4FA" },
};

const STATUSES = ["NEW","CONTACTED","QUOTED","IN_PROGRESS","DELIVERED","CLOSED"] as const;
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  NEW:         { bg:"#EFF6FF", color:"#3B82F6", label:"New" },
  CONTACTED:   { bg:"#FFFBEB", color:"#F59E0B", label:"Contacted" },
  QUOTED:      { bg:"#F5F3FF", color:"#8B5CF6", label:"Quoted" },
  IN_PROGRESS: { bg:"#ECFDF5", color:"#10B981", label:"In Progress" },
  DELIVERED:   { bg:"#DCFCE7", color:"#166534", label:"Delivered" },
  CLOSED:      { bg:"#F0F4FA", color:"#7A869A", label:"Closed" },
};

export default function CmsServicesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Inquiry | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | typeof STATUSES[number]>("ALL");
  const [savingId, setSavingId]   = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    createClient().from("service_inquiries").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setInquiries((data ?? []) as Inquiry[]); setLoading(false); });
  }, []);

  async function handleUpdate(inq: Inquiry) {
    setSavingId(inq.id);
    const { error } = await createClient().from("service_inquiries").update({
      status: editStatus, internal_notes: editNotes.trim() || null,
    }).eq("id", inq.id);
    setSavingId(null);
    if (error) { toast.error("Update failed"); return; }
    toast.success("Updated!");
    setInquiries(prev => prev.map(i => i.id === inq.id ? { ...i, status: editStatus, internal_notes: editNotes.trim() || null } : i));
    setSelected(prev => prev?.id === inq.id ? { ...prev, status: editStatus, internal_notes: editNotes.trim() || null } : prev);
  }

  const filtered = inquiries.filter(i => statusFilter === "ALL" || i.status === statusFilter);
  const newCount  = inquiries.filter(i => i.status === "NEW").length;

  return (
    <div className="flex gap-5 animate-fadeIn" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* List */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1A2035]">Service Inquiries</h1>
            <p className="text-sm text-[#7A869A]">Manage school requests for website, design & marketing</p>
          </div>
          {newCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs font-semibold text-[#3B82F6]">
              <AlertCircle size={12}/> {newCount} new
            </div>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 bg-[#F0F4FA] p-1 rounded-xl w-fit flex-wrap">
          {(["ALL", ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-white text-[#1A2035] shadow-sm" : "text-[#7A869A]"}`}>
              {s === "ALL" ? `All (${inquiries.length})` : STATUS_STYLE[s].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FF6B35]"/></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EDF5] p-12 text-center">
            <Globe size={32} className="text-[#CBD5E1] mx-auto mb-3"/>
            <p className="text-sm font-semibold text-[#1A2035]">No inquiries</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
            <div className="grid px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF5] text-[9px] font-bold text-[#7A869A] uppercase tracking-wider"
              style={{ gridTemplateColumns: "36px 1fr 100px 90px 80px 90px" }}>
              <span/><span>School</span><span>Service</span><span>Contact</span><span>Status</span><span className="text-right">Date</span>
            </div>
            <div className="divide-y divide-[#F0F4FA]">
              {filtered.map(inq => {
                const sm = SERVICE_META[inq.service_type] ?? SERVICE_META.OTHER;
                const ss = STATUS_STYLE[inq.status] ?? STATUS_STYLE.NEW;
                const isSelected = selected?.id === inq.id;
                return (
                  <div key={inq.id} onClick={() => {
                      if (!isSelected) { setEditStatus(inq.status); setEditNotes(inq.internal_notes ?? ""); }
                      setSelected(isSelected ? null : inq);
                    }}
                    className="grid px-5 py-3.5 items-center cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    style={{ gridTemplateColumns:"36px 1fr 100px 90px 80px 90px", background: isSelected ? "#FFF7F4" : undefined }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: sm.bg, color: sm.color }}>{sm.icon}</div>
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-semibold text-[#1A2035] truncate">{inq.school_name}</p>
                      <p className="text-[10px] text-[#7A869A] truncate">{inq.description.slice(0, 60)}…</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <User2 size={10} className="text-[#7A869A] shrink-0"/>
                      <span className="text-[10px] text-[#475569] truncate">{inq.contact_name}</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full w-fit" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                    <div className="text-right text-[10px] text-[#7A869A]">
                      {new Date(inq.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-96 shrink-0 bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden flex flex-col sticky top-5"
          style={{ maxHeight: "calc(100vh - 100px)" }}>
          {(() => {
            const sm = SERVICE_META[selected.service_type] ?? SERVICE_META.OTHER;
            return (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-5 py-4 border-b border-[#E8EDF5] shrink-0" style={{ background: sm.bg }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "white", color: sm.color }}>{sm.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1A2035]">{selected.school_name}</p>
                      <p className="text-[10px] text-[#7A869A]">{sm.label} Request</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-[#7A869A] hover:text-[#1A2035]">✕</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {/* Contact */}
                  <div className="bg-[#F8FAFC] rounded-xl p-3 space-y-2">
                    <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">Contact</div>
                    <div className="flex items-center gap-2">
                      <User2 size={12} className="text-[#7A869A]"/>
                      <span className="text-xs font-semibold text-[#1A2035]">{selected.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-[#7A869A]"/>
                      <a href={`tel:${selected.contact_phone}`} className="text-xs text-[#3B82F6] font-semibold hover:underline">{selected.contact_phone}</a>
                    </div>
                    {selected.contact_email && (
                      <div className="flex items-center gap-2">
                        <Globe size={12} className="text-[#7A869A]"/>
                        <span className="text-xs text-[#7A869A]">{selected.contact_email}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1.5">Requirement</div>
                    <p className="text-xs text-[#1A2035] leading-relaxed bg-[#F8FAFC] rounded-xl p-3">{selected.description}</p>
                  </div>

                  {(selected.budget_range || selected.timeline) && (
                    <div className="grid grid-cols-2 gap-3">
                      {selected.budget_range && (
                        <div className="bg-[#F8FAFC] rounded-xl p-3">
                          <div className="text-[9px] font-bold text-[#7A869A] uppercase mb-1">Budget</div>
                          <div className="text-xs font-semibold text-[#1A2035]">{selected.budget_range}</div>
                        </div>
                      )}
                      {selected.timeline && (
                        <div className="bg-[#F8FAFC] rounded-xl p-3">
                          <div className="text-[9px] font-bold text-[#7A869A] uppercase mb-1">Timeline</div>
                          <div className="text-xs font-semibold text-[#1A2035] flex items-center gap-1"><Clock size={10}/>{selected.timeline}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Update status */}
                  <div className="border-t border-[#E8EDF5] pt-4 space-y-3">
                    <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider">Update Status</div>
                    <div className="relative">
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                        className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none appearance-none focus:border-[#FF6B35]">
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-1 block">Internal Notes</label>
                      <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        rows={3} placeholder="Notes visible only to CMS team…"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none focus:border-[#FF6B35] resize-none"/>
                    </div>
                    <button onClick={() => handleUpdate(selected)} disabled={savingId === selected.id}
                      className="w-full py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#E55A28] disabled:opacity-50 transition-colors">
                      {savingId === selected.id ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle size={13}/>}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
