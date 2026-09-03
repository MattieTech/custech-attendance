'use client';

import React from 'react';
import { UserProfile } from '@/types';
import { initialCourses, initialProfiles, initialStudents } from '@/lib/db/initial-data';
import {
  Users,
  Building2,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  Send,
  HelpCircle,
} from 'lucide-react';

interface DeptRepDashboardProps {
  user: UserProfile;
}

export const DeptRepDashboard: React.FC<DeptRepDashboardProps> = ({ user }) => {
  const [complaintText, setComplaintText] = React.useState('');
  const [submittedFeedback, setSubmittedFeedback] = React.useState<string | null>(null);

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;
    setSubmittedFeedback('Department student advocacy note forwarded to the HOD.');
    setComplaintText('');
    setTimeout(() => setSubmittedFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Department Rep Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 uppercase tracking-wider">
              Department Student Representative
            </span>
            <span className="text-xs font-mono text-slate-400">
              {user.matricNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {user.firstName} {user.lastName} • Department Student Advocacy Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            National Association of Computer Science Students (NACOS) • CUSTECH Chapter
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <Building2 className="w-4 h-4 text-[#8d4a27]" />
          <span>Dept. of Computer Science</span>
        </div>
      </div>

      {/* KPI Overview for Department Student Body */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Registered Classmates
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {initialStudents.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            200 Level CS Cohort
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Cohort Avg Attendance
          </p>
          <p className="text-3xl font-black text-[#8d4a27] mt-1">
            88.4%
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Across CSC, SEN, & MTH
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Statutory Clearance
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            92%
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Currently ≥ 75% threshold
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Student Dispute Cases
          </p>
          <p className="text-3xl font-black text-amber-700 mt-1">
            1
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Under 48h review with HOD
          </p>
        </div>
      </div>

      {/* Student Welfare & Venue Feedback Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <FileCheck2 className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900">
              Department Student Representative Advocacy Liaison
            </h3>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Report lecture venue malfunctions (e.g. LH 101 power/network), timetable clashes, or unresolved attendance discrepancies directly to the Head of Department.
          </p>

          {submittedFeedback && (
            <div className="mb-4 p-3 rounded-xl bg-[#fbf5ef] border border-[#ecdacb] text-xs font-bold text-[#8d4a27] flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>{submittedFeedback}</span>
            </div>
          )}

          <form onSubmit={handleSubmitIssue} className="space-y-3">
            <textarea
              rows={3}
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              placeholder="Enter department student advocacy note or lecture venue issue..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27] text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to HOD & Student Affairs</span>
            </button>
          </form>
        </div>

        {/* Student Welfare Guidelines */}
        <div className="bg-[#fbf5ef] border border-[#ecdacb] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900">
              CUSTECH Academic Presence Regulations
            </h3>
          </div>
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="p-2.5 rounded-xl bg-white border border-[#ecdacb]">
              <strong className="text-slate-900 block font-bold">75% Statutory Exam Eligibility:</strong>
              <span>Students with attendance below 75% cannot sit semester exams without approved University Health Centre medical waiver.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#ecdacb]">
              <strong className="text-slate-900 block font-bold">48-Hour Dispute Window:</strong>
              <span>Attendance disputes must be filed within 48 hours of lecture conclusion through the student dashboard.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#ecdacb]">
              <strong className="text-slate-900 block font-bold">No Smartphone Policy:</strong>
              <span>No student is barred due to lack of a phone. In-Class Assisted Kiosk terminals are operated by Course Reps in all halls.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
