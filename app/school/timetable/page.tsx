"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { Printer, ChevronDown, X, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PageHeader } from "@/components/school/PageHeader";
import { Button } from "@/components/school/Button";

// ─── constants ───────────────────────────────────────────────────────────────
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
type Day = typeof DAYS[number];
const DAY_LABELS: Record<Day, string> = {
  MON: "Monday", TUE: "Tuesday", WED: "Wednesday",
  THU: "Thursday", FRI: "Friday", SAT: "Saturday",
};
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const PERIOD_TIMES: Record<number, string> = {
  1: "8:00",  2: "8:45",  3: "9:30",  4: "10:15",
  5: "11:15", 6: "12:00", 7: "12:45", 8: "13:30",
};
const SUBJECT_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
  "#EC4899", "#FF6B35", "#06B6D4", "#EF4444",
  "#14B8A6", "#A855F7",
];

const MIGRATION_SQL = `-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS timetable (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day         text NOT NULL CHECK (day IN ('MON','TUE','WED','THU','FRI','SAT')),
  period      integer NOT NULL CHECK (period BETWEEN 1 AND 8),
  subject_id  uuid REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id  uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (class_id, day, period)
);
CREATE INDEX IF NOT EXISTS timetable_class_id_idx ON timetable(class_id);
CREATE INDEX IF NOT EXISTS timetable_teacher_id_idx ON timetable(teacher_id);`;

// ─── types ───────────────────────────────────────────────────────────────────
interface ClassOption { id: string; name: string; section: string; }
interface ClassSubjectOption {
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string;
}
interface TimetableEntry {
  id?: string;
  classId: string;
  day: Day;
  period: number;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
}
type CellKey = `${Day}-${number}`;

function cellKey(day: Day, period: number): CellKey {
  return `${day}-${period}` as CellKey;
}

// ─── CellEditor (defined OUTSIDE main export) ────────────────────────────────
interface CellEditorProps {
  day: Day;
  period: number;
  classSubjects: ClassSubjectOption[];
  existing: TimetableEntry | null;
  onSave: (subjectId: string, teacherId: string | null) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLTableCellElement | null>;
}

function CellEditor({ day, period, classSubjects, existing, onSave, onClear, onClose, anchorRef }: CellEditorProps) {
  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? "");
  const [saving, setSaving] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const selectedCS = classSubjects.find((cs) => cs.subjectId === subjectId);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  async function handleSave() {
    if (!subjectId) { toast.error("Select a subject"); return; }
    if (!selectedCS) return;
    setSaving(true);
    await onSave(subjectId, selectedCS.teacherId);
    setSaving(false);
  }

  async function handleClear() {
    setSaving(true);
    await onClear();
    setSaving(false);
  }

  return (
    <div
      ref={popRef}
      className="absolute z-30 bg-white border border-[#E8EDF5] rounded-2xl shadow-xl p-4 w-64"
      style={{ top: "100%", left: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-[#1A2035]">{DAY_LABELS[day]} — Period {period} ({PERIOD_TIMES[period]})</div>
        <button onClick={onClose} className="text-[#7A869A] hover:text-[#1A2035]"><X size={14} /></button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-medium text-[#7A869A] uppercase tracking-wide mb-1 block">Subject</label>
          <div className="relative">
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E8EDF5] rounded-xl focus:outline-none focus:border-[#FF6B35] appearance-none bg-white"
            >
              <option value="">Select subject…</option>
              {classSubjects.map((cs) => (
                <option key={cs.subjectId} value={cs.subjectId}>{cs.subjectName}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A869A] pointer-events-none" />
          </div>
        </div>

        {selectedCS && (
          <div>
            <label className="text-[10px] font-medium text-[#7A869A] uppercase tracking-wide mb-1 block">Teacher</label>
            <div className="px-3 py-2 bg-[#F8FAFC] border border-[#E8EDF5] rounded-xl text-sm text-[#1A2035]">
              {selectedCS.teacherName || "—"}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button size="sm" variant="primary" onClick={handleSave} loading={saving} className="flex-1">
          Save
        </Button>
        {existing && (
          <Button size="sm" variant="danger" onClick={handleClear} loading={saving}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectOption[]>([]);
  const [timetable, setTimetable] = useState<Map<CellKey, TimetableEntry>>(new Map());
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [activeCell, setActiveCell] = useState<{ day: Day; period: number } | null>(null);
  const cellRefs = useRef<Map<CellKey, HTMLTableCellElement | null>>(new Map());
  const activeCellRef = useRef<HTMLTableCellElement | null>(null);

  const todayDayIndex = new Date().getDay(); // 0=Sun
  // Map JS day to our Day labels (Mon=1..Sat=6)
  const jsDayToDay: Record<number, Day | null> = { 0: null, 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };
  const todayDay = jsDayToDay[todayDayIndex];

  // Subject color map
  const subjectColorMap = new Map<string, string>();
  classSubjects.forEach((cs, idx) => {
    if (!subjectColorMap.has(cs.subjectId)) {
      subjectColorMap.set(cs.subjectId, SUBJECT_COLORS[idx % SUBJECT_COLORS.length]);
    }
  });

  // Load classes
  useEffect(() => {
    if (userLoading || !user?.schoolId) return;
    (async () => {
      setLoadingClasses(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("classes")
        .select("id, name, section")
        .eq("school_id", user.schoolId!)
        .order("name");
      const rows = (data as ClassOption[]) ?? [];
      setClasses(rows);
      if (rows.length > 0) setSelectedClassId(rows[0].id);
      setLoadingClasses(false);
    })();
  }, [user, userLoading]);

  // Load class_subjects when class changes
  useEffect(() => {
    if (!selectedClassId) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("class_subjects")
        .select("subject_id, subjects(name), teacher_id, teachers(user_id, users(name))")
        .eq("class_id", selectedClassId);

      const options: ClassSubjectOption[] = (data ?? []).map((cs) => {
        const sub = Array.isArray(cs.subjects) ? cs.subjects[0] : (cs.subjects as { name?: string } | null);
        const tch = Array.isArray(cs.teachers) ? cs.teachers[0] : (cs.teachers as { user_id?: string; users?: unknown } | null);
        const usr = tch ? (Array.isArray((tch as { users?: unknown }).users) ? ((tch as { users?: unknown[] }).users as { name?: string }[])?.[0] : (tch as { users?: { name?: string } }).users) : null;
        // timetable.teacher_id references users.id, so store user_id (not teachers.id)
        const userIdForTimetable = (tch as { user_id?: string } | null)?.user_id ?? null;
        return {
          subjectId: cs.subject_id as string,
          subjectName: sub?.name ?? "Unknown",
          teacherId: userIdForTimetable,   // users.id or null
          teacherName: (usr as { name?: string } | null)?.name ?? "—",
        };
      });
      setClassSubjects(options);
    })();
  }, [selectedClassId]);

  // Load timetable entries for selected class
  const loadTimetable = useCallback(async () => {
    if (!selectedClassId) return;
    setLoadingTimetable(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("timetable")
        // timetable.teacher_id → users.id (direct FK, no teachers join)
        .select("id, class_id, day, period, subject_id, subjects(name), teacher_id, users(name)")
        .eq("class_id", selectedClassId);

      if (error) {
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.message?.includes("schema cache")) {
          setTableExists(false);
        } else {
          toast.error("Error loading timetable: " + error.message);
        }
        setLoadingTimetable(false);
        return;
      }

      setTableExists(true);
      const map = new Map<CellKey, TimetableEntry>();
      for (const row of (data ?? [])) {
        const sub = Array.isArray(row.subjects) ? row.subjects[0] : (row.subjects as { name?: string } | null);
        // users is a direct join now (timetable.teacher_id → users.id)
        const usr = Array.isArray(row.users) ? row.users[0] : (row.users as { name?: string } | null);

        const day = row.day as Day;
        const period = row.period as number;
        map.set(cellKey(day, period), {
          id: row.id,
          classId: row.class_id,
          day,
          period,
          subjectId: row.subject_id,
          subjectName: sub?.name ?? "",
          teacherId: row.teacher_id,
          teacherName: usr?.name ?? "",
        });
      }
      setTimetable(map);
    } finally {
      setLoadingTimetable(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadTimetable();
    setActiveCell(null);
  }, [loadTimetable]);

  async function handleSaveCell(day: Day, period: number, subjectId: string, teacherId: string | null) {
    const supabase = createClient();
    const cs = classSubjects.find((c) => c.subjectId === subjectId);

    const { error } = await supabase.from("timetable").upsert({
      class_id: selectedClassId!,
      day,
      period,
      subject_id: subjectId || null,
      teacher_id: teacherId || null,   // empty string → null to satisfy FK
    }, { onConflict: "class_id,day,period" });

    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success("Saved");
    setActiveCell(null);
    await loadTimetable();
    void cs; // suppress unused warning
  }

  async function handleClearCell(day: Day, period: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from("timetable")
      .delete()
      .eq("class_id", selectedClassId!)
      .eq("day", day)
      .eq("period", period);
    if (error) { toast.error("Failed to clear: " + error.message); return; }
    toast.success("Cleared");
    setActiveCell(null);
    await loadTimetable();
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  if (userLoading || loadingClasses) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Timetable"
        subtitle="Manage class schedules week-by-week"
        actions={
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer size={14} /> Print / Export
          </Button>
        }
      />

      {/* Migration needed banner */}
      {!tableExists && (
        <div className="mb-6 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#92400E]">Run the timetable migration first</div>
              <div className="text-xs text-[#78350F] mt-0.5">The timetable table does not exist yet. Copy the SQL below and run it in your Supabase SQL editor.</div>
            </div>
          </div>
          <div className="bg-[#1A2035] rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-[#A5F3FC] font-mono whitespace-pre">{MIGRATION_SQL}</pre>
          </div>
        </div>
      )}

      {/* Class selector pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClassId(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedClassId === c.id
                ? "bg-[#FF6B35] text-white shadow-sm"
                : "bg-white border border-[#E8EDF5] text-[#7A869A] hover:bg-[#F0F4FA]"
            }`}
          >
            {c.name}{c.section ? `-${c.section}` : ""}
          </button>
        ))}
        {classes.length === 0 && (
          <div className="text-sm text-[#7A869A]">No classes found. Add classes first.</div>
        )}
      </div>

      {selectedClass && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-[#1A2035]">
            {selectedClass.name}{selectedClass.section ? `-${selectedClass.section}` : ""}
            {loadingTimetable && <span className="ml-2 text-xs text-[#7A869A] font-normal">Loading…</span>}
          </div>
          {classSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {classSubjects.map((cs, idx) => (
                <div key={cs.subjectId} className="flex items-center gap-1.5 text-xs text-[#7A869A]">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }} />
                  {cs.subjectName}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No subjects notice */}
      {selectedClass && classSubjects.length === 0 && !loadingTimetable && (
        <div className="bg-white border border-[#E8EDF5] rounded-2xl p-8 text-center text-sm text-[#7A869A]">
          No subjects assigned to this class yet. Add subjects via the Subjects page first.
        </div>
      )}

      {/* Grid */}
      {selectedClass && classSubjects.length > 0 && tableExists && (
        <div className="bg-white border border-[#E8EDF5] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E8EDF5]">
                  <th className="text-left text-xs font-semibold text-[#7A869A] py-3 px-4 w-32">
                    Period
                  </th>
                  {DAYS.map((day) => {
                    const isToday = todayDay === day;
                    return (
                      <th
                        key={day}
                        className={`text-center text-xs font-semibold py-3 px-2 ${
                          isToday ? "text-[#FF6B35]" : "text-[#7A869A]"
                        }`}
                      >
                        {DAY_LABELS[day]}
                        {isToday && <span className="ml-1 text-[9px] bg-[#FF6B35] text-white px-1 py-0.5 rounded-full">Today</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className="border-b border-[#F0F4FA] last:border-0">
                    {/* Period label */}
                    <td className="py-2 px-4">
                      <div className="text-xs font-bold text-[#1A2035]">P{period}</div>
                      <div className="text-[10px] text-[#7A869A]">{PERIOD_TIMES[period]}</div>
                    </td>

                    {/* Day cells */}
                    {DAYS.map((day) => {
                      const key = cellKey(day, period);
                      const entry = timetable.get(key) ?? null;
                      const color = entry ? (subjectColorMap.get(entry.subjectId) ?? "#7A869A") : null;
                      const isToday = todayDay === day;
                      const isActive = activeCell?.day === day && activeCell?.period === period;

                      return (
                        <td
                          key={day}
                          ref={(el) => {
                            cellRefs.current.set(key, el);
                            if (isActive) activeCellRef.current = el;
                          }}
                          className={`py-1.5 px-1.5 relative ${isToday ? "bg-[#FFFBF5]" : ""}`}
                          style={isToday ? { outline: "1px solid #FFD8C8", outlineOffset: "-1px" } : {}}
                        >
                          <div
                            className={`rounded-xl min-h-[48px] cursor-pointer transition-all hover:opacity-80 ${
                              isActive ? "ring-2 ring-[#FF6B35] ring-offset-1" : ""
                            }`}
                            style={
                              entry && color
                                ? { background: color + "18", borderLeft: `3px solid ${color}` }
                                : { background: "#F8FAFC", border: "1px dashed #E2E8F0" }
                            }
                            onClick={() => {
                              activeCellRef.current = cellRefs.current.get(key) ?? null;
                              setActiveCell(isActive ? null : { day, period });
                            }}
                          >
                            {entry ? (
                              <div className="p-2">
                                <div className="text-[11px] font-semibold leading-tight truncate" style={{ color }}>
                                  {entry.subjectName}
                                </div>
                                <div className="text-[9px] text-[#7A869A] truncate mt-0.5">{entry.teacherName}</div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full min-h-[48px]">
                                <span className="text-[10px] text-[#CBD5E1]">+</span>
                              </div>
                            )}
                          </div>

                          {/* Inline popover */}
                          {isActive && (
                            <CellEditor
                              day={day}
                              period={period}
                              classSubjects={classSubjects}
                              existing={entry}
                              onSave={(subjectId, teacherId) => handleSaveCell(day, period, subjectId, teacherId)}
                              onClear={() => handleClearCell(day, period)}
                              onClose={() => setActiveCell(null)}
                              anchorRef={{ current: cellRefs.current.get(key) ?? null } as React.RefObject<HTMLTableCellElement | null>}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer hint */}
          <div className="px-4 py-3 border-t border-[#F0F4FA] bg-[#FAFBFC] text-xs text-[#7A869A]">
            Click any cell to assign or change a subject. Changes are saved immediately.
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
