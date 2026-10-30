'use client';

import React from 'react';
import { UserProfile } from '@/types';
import { Building2, TrendingUp, Users, Award, Download, CheckCircle } from 'lucide-react';

interface DeanDashboardProps {
  user: UserProfile;
}

export const DeanDashboard: React.FC<DeanDashboardProps> = ({ user }) => {
  return (
    <div className="space-y-6">
      {/* Dean Faculty Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Faculty Executive Oversight
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">FCMS Complex</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Faculty of Computing & Mathematical Sciences — Dean’s Portal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dean: Prof. M. O. Yusuf. Monitoring 3 departments, 540 enrolled students, and 18 academic staff.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting Faculty Accreditation Audit Pack (PDF)...')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          <span>Faculty Accreditation Audit</span>
        </button>
      </div>

      {/* Faculty KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <span className="text-xs font-semibold text-slate-500">Faculty Aggregate Attendance</span>
          <p className="text-3xl font-black text-slate-900 mt-2">87.8%</p>
          <p className="text-xs text-slate-400 mt-1">First Semester 2026/2027</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <span className="text-xs font-semibold text-slate-500">Scheduled Lectures Held</span>
          <p className="text-3xl font-black text-slate-900 mt-2">94.2%</p>
          <p className="text-xs text-slate-400 mt-1">Syllabus delivery on schedule</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <span className="text-xs font-semibold text-slate-500">Exam Bar Risk (&lt;75%)</span>
          <p className="text-3xl font-black text-amber-600 mt-2">4.1%</p>
          <p className="text-xs text-slate-400 mt-1">22 students across all 3 departments</p>
        </div>
      </div>

      {/* DEPARTMENT COMPARISON MATRIX */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Departmental Presence & Compliance Breakdown
        </h3>

        <div className="space-y-3">
          {/* Dept 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Department of Computer Science (CSC)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                HOD: Dr. K. A. Adeleke • 180 Students • 8 Active Offerings
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-base font-black text-slate-900">89.2%</span>
              <p className="text-xs text-slate-400">96.0% Lecture Compliance</p>
            </div>
          </div>

          {/* Dept 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Department of Software Engineering (SEN)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                HOD: Dr. Zainab Idris • 210 Students • 10 Active Offerings
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-base font-black text-slate-900">86.5%</span>
              <p className="text-xs text-slate-400">93.5% Lecture Compliance</p>
            </div>
          </div>

          {/* Dept 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Department of Cybersecurity (CYS)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                HOD: Dr. A. T. Musa • 150 Students • 7 Active Offerings
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-base font-black text-slate-900">91.0%</span>
              <p className="text-xs text-slate-400">97.0% Lecture Compliance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
