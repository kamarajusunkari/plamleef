"use client";
import React, { useEffect, useState } from "react";

interface LineChartProps {
  data: number[];
  labels?: string[];
  avgLine?: number;
  className?: string;
  height?: number;
}

export function LineChart({
  data,
  labels,
  avgLine,
  className = "",
  height = 160,
}: LineChartProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const width = 600;
  const padX = 30;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const minVal = Math.max(0, Math.min(...data) - 10);
  const maxVal = Math.min(100, Math.max(...data) + 10);
  const range = maxVal - minVal;

  const toX = (i: number) => padX + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padY + chartH - ((v - minVal) / range) * chartH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  const avgY = avgLine ? toY(avgLine) : null;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height + 30}`} className="w-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
          </linearGradient>
        </defs>

        {avgY !== null && (
          <line
            x1={padX}
            y1={avgY}
            x2={width - padX}
            y2={avgY}
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        )}

        {animated && (
          <polyline
            points={points}
            fill="none"
            stroke="#FF6B35"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {animated &&
          data.map((v, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(v)} r="5" fill="#FF6B35" stroke="white" strokeWidth="2" />
              <text
                x={toX(i)}
                y={toY(v) - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#7A869A"
              >
                {v}%
              </text>
            </g>
          ))}

        {labels &&
          labels.map((l, i) => (
            <text
              key={i}
              x={toX(i)}
              y={height + 15}
              textAnchor="middle"
              fontSize="10"
              fill="#7A869A"
            >
              {l}
            </text>
          ))}
      </svg>
    </div>
  );
}
