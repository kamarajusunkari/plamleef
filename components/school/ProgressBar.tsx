"use client";
import React, { useEffect, useState } from "react";

interface ProgressBarProps {
  value: number;
  max?: number;
  height?: number;
  color?: string;
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  height = 8,
  color,
  animated = true,
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const pct = Math.min((value / max) * 100, 100);

  const barColor =
    color ||
    (pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444");

  useEffect(() => {
    if (animated) {
      const t = setTimeout(() => setWidth(pct), 100);
      return () => clearTimeout(t);
    } else {
      setWidth(pct);
    }
  }, [pct, animated]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex-1 rounded-full bg-[#F0F4FA] overflow-hidden"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: barColor }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium shrink-0" style={{ color: barColor }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
