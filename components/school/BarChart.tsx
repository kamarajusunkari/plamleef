"use client";
import React, { useEffect, useState } from "react";

interface BarChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  avgLine?: number;
  className?: string;
}

export function BarChart({
  data,
  labels,
  height = 100,
  color = "#FF6B35",
  avgLine,
  className = "",
}: BarChartProps) {
  const [animated, setAnimated] = useState(false);
  const max = Math.max(...data, 1);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const avgPct = avgLine ? (avgLine / 100) * height : null;

  return (
    <div className={`relative ${className}`} style={{ height: height + 20 }}>
      {avgPct !== null && avgLine !== undefined && (
        <div
          className="absolute left-0 right-0 border-t border-dashed border-[#7A869A] flex items-center"
          style={{ top: height - avgPct }}
        >
          <span className="text-[9px] text-[#7A869A] ml-1 bg-white px-1">avg {avgLine}%</span>
        </div>
      )}
      <div className="flex items-end gap-1 h-full pt-2">
        {data.map((val, i) => {
          const pct = (val / max) * height;
          const barColor =
            i === data.length - 1 ? "#FF6B35" : color;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm transition-[height] duration-700 ease-out"
                style={{
                  height: animated ? pct : 0,
                  backgroundColor: barColor,
                  opacity: i === data.length - 1 ? 1 : 0.6,
                }}
              />
              {labels && (
                <span className="text-[9px] text-[#7A869A]">{labels[i]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
