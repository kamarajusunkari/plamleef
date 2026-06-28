"use client";
import React, { useEffect, useState } from "react";

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
  centerLabel?: string;
  centerSub?: string;
  size?: number;
}

export function DonutChart({
  segments,
  total,
  centerLabel,
  centerSub,
  size = 120,
}: DonutChartProps) {
  const [animated, setAnimated] = useState(false);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, []);

  let cumulative = 0;
  const strokeDashoffset = circumference * 0.25;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#F0F4FA"
          strokeWidth={14}
        />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = animated ? circumference * frac : 0;
          const gap = circumference - dash;
          const offset = strokeDashoffset - cumulative * circumference;
          cumulative += frac;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              style={{ transition: "stroke-dasharray 1s ease-out" }}
            />
          );
        })}
      </svg>
      {(centerLabel || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <div className="text-xl font-bold text-[#1A2035]">{centerLabel}</div>
          )}
          {centerSub && (
            <div className="text-xs text-[#7A869A]">{centerSub}</div>
          )}
        </div>
      )}
    </div>
  );
}
