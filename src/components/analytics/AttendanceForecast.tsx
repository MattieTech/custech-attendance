'use client';

import React from 'react';
import { computeAttendanceForecastAction } from '@/actions/advanced';
import { HelpCircle, Calculator, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface AttendanceForecastProps {
  currentAttended: number;
  currentAbsent: number;
  courseCode: string;
}

export const AttendanceForecast: React.FC<AttendanceForecastProps> = ({
  currentAttended,
  currentAbsent,
  courseCode,
}) => {
  const [remainingLectures, setRemainingLectures] = React.useState(5);
  const [projectedAttended, setProjectedAttended] = React.useState(4);

  const totalHeld = currentAttended + currentAbsent;
  const projectedTotal = totalHeld + remainingLectures;
  const projectedAttendedTotal = currentAttended + projectedAttended;
  const projectedPercentage =
    projectedTotal > 0 ? Math.round((projectedAttendedTotal / projectedTotal) * 1000) / 10 : 100;

  const isEligible = projectedPercentage >= 75.0;

  // Minimum required to hit 75%
  const minRequiredFor75 = Math.max(
    0,
    Math.ceil(0.75 * projectedTotal - currentAttended)
  );
  const maxCanMiss = Math.max(0, remainingLectures - minRequiredFor75);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#8d4a27]" />
          <h3 className="text-sm font-bold text-slate-900">
            Attendance Projection & "What-If" Calculator
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-[#8d4a27]">
          {courseCode}
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Simulate future attendance to calculate how many classes you must attend to guarantee statutory 75% exam clearance.
      </p>

      {/* Interactive Sliders */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-slate-700">
              Estimated Lectures Remaining in Semester:
            </span>
            <span className="font-bold text-[#8d4a27] font-mono">
              {remainingLectures} lectures
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={12}
            value={remainingLectures}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRemainingLectures(val);
              if (projectedAttended > val) setProjectedAttended(val);
            }}
            className="w-full accent-[#8d4a27] cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-slate-700">
              How Many of These Will You Attend?
            </span>
            <span className="font-bold text-[#8d4a27] font-mono">
              {projectedAttended} of {remainingLectures}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={remainingLectures}
            value={projectedAttended}
            onChange={(e) => setProjectedAttended(Number(e.target.value))}
            className="w-full accent-[#8d4a27] cursor-pointer"
          />
        </div>
      </div>

      {/* Forecast Result Card */}
      <div
        className={`mt-5 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isEligible
            ? 'bg-slate-50 border-slate-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            {isEligible ? (
              <CheckCircle2 className="w-5 h-5 text-[#8d4a27] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <h4
                className={`text-sm font-bold ${
                  isEligible ? 'text-slate-900' : 'text-rose-900'
                }`}
              >
                {isEligible ? 'Target Met: Cleared for Examination' : 'Danger: Exam Ineligibility'}
              </h4>
              <p
                className={`text-xs mt-0.5 ${
                  isEligible ? 'text-slate-500' : 'text-rose-700'
                }`}
              >
                {isEligible
                  ? `You will achieve ${projectedPercentage}% attendance (≥ 75% threshold).`
                  : `Projected attendance of ${projectedPercentage}% is below statutory 75% minimum.`}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center sm:text-right shrink-0">
          <span
            className={`text-3xl font-black font-mono ${
              isEligible ? 'text-[#8d4a27]' : 'text-rose-600'
            }`}
          >
            {projectedPercentage}%
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEligible ? (
              <span>Can miss up to <strong>{maxCanMiss}</strong> more</span>
            ) : (
              <span className="text-rose-600 font-bold">Must attend {minRequiredFor75} more</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
