'use client';

import React from 'react';
import { calculateAttendancePercentage } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface PercentageRingProps {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const PercentageRing: React.FC<PercentageRingProps> = ({
  presentCount,
  lateCount,
  absentCount,
  excusedCount = 0,
  size = 'md',
}) => {
  const { percentage, isEligible, isWarning, isCritical } = calculateAttendancePercentage(
    presentCount,
    lateCount,
    absentCount,
    excusedCount
  );

  const dimension = size === 'sm' ? 70 : size === 'lg' ? 120 : 96;
  const strokeWidth = size === 'sm' ? 6 : 8;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClass = isCritical
    ? 'text-rose-600'
    : isWarning
    ? 'text-amber-500'
    : 'text-[#8d4a27]';

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: dimension, height: dimension }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${dimension} ${dimension}`}>
          {/* Background circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            className="stroke-slate-200"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            className={`${colorClass} transition-all duration-1000 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Percentage Text */}
        <div className="absolute flex flex-col items-center">
          <span
            className={`font-black tracking-tighter ${
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'
            } text-slate-900`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Threshold Status Label */}
      <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
        {isEligible ? (
          <span className="text-[#8d4a27] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Eligible for Exams (≥75%)</span>
          </span>
        ) : isWarning ? (
          <span className="text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Attendance Warning (&lt;75%)</span>
          </span>
        ) : (
          <span className="text-rose-700 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Barred / Ineligible Risk</span>
          </span>
        )}
      </div>
    </div>
  );
};
