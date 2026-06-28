"use client";
import React, { useState, useEffect } from "react";
import {
  Globe, Palette, BarChart2, FileText, Loader2, CheckCircle,
  Clock, ChevronRight, Phone, Send, Star, Image,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const SERVICES = [
  { id:"WEBSITE",          icon:<Globe size={22}/>,    label:"School Website",         desc:"Professional website with admissions, gallery, staff pages",         price:"₹15,000 – ₹50,000", time:"2–4 weeks",  color:"#3B82F6", bg:"#EFF6FF" },
  { id:"DIGITAL_MARKETING",icon:<BarChart2 size={22}/>,label:"Digital Marketing",      desc:"Social media, Google Ads, enrollment campaigns",                     price:"₹8,000/month",      time:"Ongoing",    color:"#10B981", bg:"#ECFDF5" },
  { id:"PPT_DESIGN",       icon:<FileText size={22}/>, label:"Presentation Design",    desc:"Annual day, board meetings, parent orientation decks",               price:"₹2,000 – ₹8,000",  time:"3–5 days",   color:"#8B5CF6", bg:"#F5F3FF" },
  { id:"POSTER_DESIGN",    icon:<Image size={22}/>,    label:"Poster & Banner Design", desc:"Event posters, WhatsApp banners, notice boards, hoardings",          price:"₹500 – ₹2,000",    time:"1–2 days",   color:"#FF6B35", bg:"#FFF7F4" },
  { id:"LOGO",             icon:<Star size={22}/>,     label:"Logo Design",            desc:"Professional school branding and identity",                          price:"₹3,000 – ₹10,000", time:"1 week",     color:"#F59E0B", bg:"#FFFBEB" },
  { id:"CONTENT_WRITING",  icon:<FileText size={22}/>, label:"Content Writing",        desc:"Newsletters, circulars, website copy, social media posts",           price:"₹500 – ₹3,000",    time:"2–5 days",   color:"#EC4899", bg:"#FDF2F8" },
  { id:"OTHER",            icon:<ChevronRight size={22}/>, label:"Other / Custom",     desc:"Tell us what you need — we'll quote within 24 hours",               price:"Quoted on request", time:"Varies",     color:"#7A869A", bg:"#F0F4FA" },
];

interface Inquiry {
  id: string; service_type: string; description: string; status: string; created_at: string;
}

export default function SchoolServicesPage() {
  const { user } = useCurrentUser();
  const [selected,   setSelected]   = useState<string | null>(null);
  const [inquiries,  setInquiries]  = useState<Inquiry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [form, setForm] = useState({ description:"", budget_range:"", timeline:"", contact_name:"", contact_phone:"", contact_email:"" });

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("service_inquiries").select("id, service_type, description, status, created_at")
      .eq("school_id", user.schoolId ?? "")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setInquiries((data ?? []) as Inquiry[]); setLoading(false); });
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !user) return;
    if (!form.description.trim()) { toast.error("Please describe what you need"); return; }
    if (!form.contact_name.trim() || !form.contact_phone.trim()) { toast.error("Contact name and phone are required"); return; }
    setSubmitting(true);
    const { data, error } = await createClient().from("service_inquiries").insert({
      school_id: user.schoolId, school_name: user.schoolName ?? "Unknown School",
      contact_name: form.contact_name.trim(), contact_phone: form.contact_phone.trim(),
      contact_email: form.contact_email.trim() || null,
      service_type: selected, description: form.description.trim(),
      budget_range: form.budget_range.trim() || null, timeline: form.timeline.trim() || null,
      status: "NEW",
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error("Submission failed. Try again."); return; }
    toast.success("Inquiry submitted! Our team will call you within 24 hours on WhatsApp.");
    setInquiries(prev => [data as Inquiry, ...prev]);
    setSelected(null);
    setForm({ description:"", budget_range:"", timeline:"", contact_name:"", contact_phone:"", contact_email:"" });
  }

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    NEW:         { bg:"#EFF6FF", color:"#3B82F6", label:"New" },
    CONTACTED:   { bg:"#FFFBEB", color:"#F59E0B", label:"Contacted" },
    QUOTED:      { bg:"#F5F3FF", color:"#8B5CF6", label:"Quoted" },
    IN_PROGRESS: { bg:"#ECFDF5", color:"#10B981", label:"In Progress" },
    DELIVERED:   { bg:"#DCFCE7", color:"#166534", label:"Delivered" },
    CLOSED:      { bg:"#F0F4FA", color:"#7A869A", label:"Closed" },
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-[#1A2035]">Technical Services</h1>
        <p className="text-sm text-[#7A869A]">Website, design, marketing and more — built specifically for schools</p>
      </div>

      {/* Services grid */}
      <div>
        <div className="text-[10px] font-bold text-[#7A869A] uppercase tracking-wider mb-3">What do you need?</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {SERVICES.map(svc => (
            <button key={svc.id} onClick={() => setSelected(svc.id === selected ? null : svc.id)}
              className="text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md"
              style={{
                borderColor: selected === svc.id ? svc.color : "#E8EDF5",
                background: selected === svc.id ? svc.bg : "white",
              }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: svc.bg, color: svc.color }}>{svc.icon}</div>
              <div className="text-sm font-bold text-[#1A2035] mb-1">{svc.label}</div>
              <div className="text-[10px] text-[#7A869A] mb-3 leading-relaxed">{svc.desc}</div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold" style={{ color: svc.color }}>{svc.price}</span>
                <span className="text-[9px] text-[#7A869A] flex items-center gap-1"><Clock size={9}/> {svc.time}</span>
              </div>
              {selected === svc.id && (
                <div className="mt-3 flex items-center gap-1 text-[10px] font-bold" style={{ color: svc.color }}>
                  <CheckCircle size={12}/> Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiry form */}
      {selected && (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          {(() => {
            const svc = SERVICES.find(s => s.id === selected)!;
            return (
              <>
                <div className="px-6 py-4 border-b border-[#E8EDF5] flex items-center gap-3" style={{ background: svc.bg }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "white", color: svc.color }}>{svc.icon}</div>
                  <div>
                    <div className="text-sm font-bold text-[#1A2035]">Request: {svc.label}</div>
                    <div className="text-[10px] text-[#7A869A]">Fill the form — our team will call within 24 hours</div>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Describe what you need *</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={4} required placeholder={`e.g. We need a ${svc.label.toLowerCase()} for our school with the following…`}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none resize-none"
                      style={{ focusBorderColor: svc.color } as React.CSSProperties}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Budget Range</label>
                      <input value={form.budget_range} onChange={e => setForm(f => ({ ...f, budget_range: e.target.value }))}
                        placeholder="e.g. ₹10,000 – ₹25,000"
                        className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none"/>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Timeline</label>
                      <input value={form.timeline} onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))}
                        placeholder="e.g. Within 2 weeks"
                        className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none"/>
                    </div>
                  </div>
                  <div className="border-t border-[#E8EDF5] pt-4">
                    <div className="text-xs font-bold text-[#7A869A] uppercase tracking-wider mb-3 flex items-center gap-2"><Phone size={12}/> Contact Details</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">Your Name *</label>
                        <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} required
                          placeholder="Principal / Admin name"
                          className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#7A869A] uppercase tracking-wider mb-1.5 block">WhatsApp Number *</label>
                        <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} required type="tel"
                          placeholder="+91 9876543210"
                          className="w-full h-10 px-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC] text-sm text-[#1A2035] outline-none"/>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50"
                    style={{ background: svc.color }}>
                    {submitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                    Submit Inquiry — We Call Within 24 Hours
                  </button>
                </form>
              </>
            );
          })()}
        </div>
      )}

      {/* Previous inquiries */}
      {!loading && inquiries.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8EDF5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8EDF5] text-sm font-bold text-[#1A2035]">My Inquiries</div>
          <div className="divide-y divide-[#F0F4FA]">
            {inquiries.map(inq => {
              const svc = SERVICES.find(s => s.id === inq.service_type);
              const ss = STATUS_STYLE[inq.status] ?? STATUS_STYLE.NEW;
              return (
                <div key={inq.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: svc?.bg ?? "#F0F4FA", color: svc?.color ?? "#7A869A" }}>
                    {svc?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A2035]">{svc?.label ?? inq.service_type}</p>
                    <p className="text-[10px] text-[#7A869A] truncate">{inq.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                    <span className="text-[9px] text-[#7A869A]">{new Date(inq.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
