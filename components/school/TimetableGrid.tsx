"use client";
import React from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Period", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TimetableSlot {
  period: number;
  day: number;
  subject: string;
  teacher: string;
  color: string;
  room: string;
}

interface Period {
  no: number | string;
  time: string;
  isBreak: boolean;
  label?: string;
}

interface TimetableGridProps {
  periods: Period[];
  slots: TimetableSlot[];
  classId: string;
  currentPeriod?: number;
  nextPeriod?: number;
}

export function TimetableGrid({
  periods,
  slots,
  classId,
  currentPeriod = 4,
  nextPeriod = 5,
}: TimetableGridProps) {
  const router = useRouter();

  const getSlot = (periodNo: number | string, day: number) => {
    if (typeof periodNo === "string") return null;
    return slots.find((s) => s.period === periodNo && s.day === day);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {DAYS.map((d, i) => (
              <th
                key={i}
                className="p-2 text-xs font-semibold text-[#7A869A] text-left border-b border-[#E8EDF5] min-w-[100px]"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            if (period.isBreak) {
              const isLunch = period.label === "Lunch";
              return (
                <tr key={`break-${period.no}`}>
                  <td
                    colSpan={7}
                    className={`px-3 py-2 text-xs font-medium text-center ${
                      isLunch ? "bg-[#F0FDF4] text-[#10B981]" : "bg-[#EFF6FF] text-[#3B82F6]"
                    }`}
                  >
                    {isLunch ? "🍱" : "☕"} {period.label} {period.time}
                  </td>
                </tr>
              );
            }

            return (
              <tr key={`period-${period.no}`} className="border-b border-[#F0F4FA]">
                <td className="p-2 text-xs text-[#7A869A]">
                  <div className="font-semibold text-[#1A2035]">P{period.no}</div>
                  <div>{period.time}</div>
                </td>
                {[1, 2, 3, 4, 5, 6].map((day) => {
                  const slot = getSlot(period.no, day);
                  const isCurrent = period.no === currentPeriod && day === 1;
                  const isNext = period.no === nextPeriod && day === 1;

                  if (!slot || slot.subject === "Free") {
                    return (
                      <td key={day} className="p-1">
                        <div className="rounded-lg bg-[#F8FAFC] border border-dashed border-[#E8EDF5] h-14 flex items-center justify-center">
                          <span className="text-[10px] text-[#94A3B8] italic">Free</span>
                        </div>
                      </td>
                    );
                  }

                  const bgHex = slot.color;

                  return (
                    <td key={day} className="p-1">
                      <div
                        onClick={() => router.push(`/school/classes/${classId}`)}
                        className={`relative rounded-lg p-2 h-14 cursor-pointer hover:opacity-90 transition-opacity ${
                          isCurrent ? "ring-2 ring-[#FF6B35]" : isNext ? "ring-2 ring-dashed ring-[#3B82F6]" : ""
                        }`}
                        style={{
                          backgroundColor: bgHex + "22",
                          borderLeft: `3px solid ${bgHex}`,
                        }}
                      >
                        {isCurrent && (
                          <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-[#FF6B35] bg-[#FFF7F4] px-1 rounded">
                            NOW
                          </span>
                        )}
                        {isNext && (
                          <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-[#3B82F6] bg-[#EFF6FF] px-1 rounded">
                            NEXT
                          </span>
                        )}
                        <div
                          className="text-[11px] font-semibold truncate"
                          style={{ color: bgHex }}
                        >
                          {slot.subject}
                        </div>
                        {slot.teacher && (
                          <div className="text-[10px] text-[#7A869A] truncate">{slot.teacher}</div>
                        )}
                        {slot.room && (
                          <div className="text-[9px] text-[#94A3B8]">{slot.room}</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
