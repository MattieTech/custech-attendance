'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile } from '@/types';
import {
  Users,
  GraduationCap,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  BookOpen,
  Clock,
  Download,
  ShieldAlert,
  HeartPulse,
} from 'lucide-react';
import { FraudMonitoringModal } from '../fraud/FraudMonitoringModal';
import { MedicalWaiverModal } from '../medical/MedicalWaiverModal';

interface HodDashboardProps {
  user: UserProfile;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({ user }) => {
  const [isFraudOpen, setIsFraudOpen] = React.useState(false);
  const [isMedicalOpen, setIsMedicalOpen] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const departmentCourses = custechDb.getCourses().filter((c) => c.departmentId === 'dept-csc');
  const allStudents = custechDb.getProfiles().filter((p) => p.primaryRole === 'STUDENT');
  const sessions = custechDb.getSessions();
  const collisionAlerts = custechDb.getDeviceCollisionAlerts();
  const unreviewedCount = collisionAlerts.filter((a) => !a.isReviewed).length;

  // Export CSV Report
  const handleExportCSV = () => {
    const rows = [
      ['Matric Number', 'Student Name', 'Course', 'Sessions Attended', 'Eligible Sessions', 'Attendance %', 'Status'],
      ['25L1CS1014', 'Amina Usman', 'CSC 201', '3', '3', '100.0%', 'Eligible for Exams'],
      ['25L1CS1029', 'Emeka Okonkwo', 'CSC 201', '2', '3', '66.7%', 'ATTENDANCE WARNING (<75%)'],
      ['25L1CS1045', 'Maryam Yakubu', 'CSC 201', '3', '3', '100.0%', 'Eligible for Exams (Assisted Kiosk)'],
      ['25L1CS1001', 'Ibrahim Aliyu', 'CSC 201', '3', '3', '100.0%', 'Eligible for Exams (Course Rep)'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'CUSTECH_CSC_Department_Attendance_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Department Governance & Oversight
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">Faculty of Computing</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Department of Computer Science — HOD Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Head of Department: Dr. K. A. Adeleke. Monitoring 4 active courses, syllabus progression, and lecture delivery compliance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsFraudOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Anti-Proxy</span>
            {unreviewedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {unreviewedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsMedicalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition shadow-sm"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Clinic Waivers</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Average Dept Attendance</span>
            <GraduationCap className="w-4 h-4 text-[#8d4a27]" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">89.2%</p>
          <p className="text-xs text-slate-400 mt-1">+3.4% higher than faculty average</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Lecture Delivery Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">96.0%</p>
          <p className="text-xs text-slate-400 mt-1">24 of 25 scheduled classes delivered</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Students Below 75%</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2">1</p>
          <p className="text-xs text-slate-400 mt-1">Emeka Okonkwo (66.7% in CSC 201)</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Average Syllabus Coverage</span>
            <BookOpen className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">50.0%</p>
          <p className="text-xs text-slate-400 mt-1">Week 3 of 6 semester schedule</p>
        </div>
      </div>

      {/* AT-RISK STUDENTS WARNING LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Exam Ineligibility Risk Roster (&lt; 75% Attendance)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Statutory requirement threshold</span>
        </div>
        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">
                Emeka Okonkwo
              </span>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                25L1CS1029
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                66.7% Attendance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Missed Week 2 Lecture in CSC 201. Correction request currently pending with Dr. John Doe.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-amber-700 bg-white px-3 py-1.5 rounded-lg border border-amber-200">
              Exam Clearance Barred
            </span>
          </div>
        </div>
      </div>

      {/* DEPARTMENT COURSE COMPLIANCE TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Department Course Delivery & Attendance Compliance
            </h3>
            <p className="text-xs text-slate-500">
              Live tracking across 200 Level First Semester courses
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Updated 5m ago</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs divide-y divide-slate-100 min-w-[640px]">
            <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-xs">
              <tr>
                <th className="pb-3 pt-1">Course</th>
                <th className="pb-3 pt-1">Title</th>
                <th className="pb-3 pt-1">Primary Lecturer</th>
                <th className="pb-3 pt-1">Syllabus Progress</th>
                <th className="pb-3 pt-1">Avg Attendance</th>
                <th className="pb-3 pt-1">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 font-bold text-slate-900">CSC 201</td>
                <td className="py-3 font-medium text-slate-800">Data Structures and Algorithms</td>
                <td className="py-3 text-slate-500">Dr. John Doe</td>
                <td className="py-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] font-bold text-xs">
                    Week 2 / 4 Taught (50%)
                  </span>
                </td>
                <td className="py-3 font-bold text-slate-900">91.6%</td>
                <td className="py-3 text-amber-800 font-semibold">Active Session</td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 font-bold text-slate-900">MTH 201</td>
                <td className="py-3 font-medium text-slate-800">Mathematical Methods I</td>
                <td className="py-3 text-slate-500">Dr. John Doe</td>
                <td className="py-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                    Week 2 / 4 Taught (50%)
                  </span>
                </td>
                <td className="py-3 font-bold text-slate-900">87.5%</td>
                <td className="py-3 text-slate-400">Scheduled (Tue)</td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 font-bold text-slate-900">PHY 201</td>
                <td className="py-3 font-medium text-slate-800">General Physics for Engineers</td>
                <td className="py-3 text-slate-500">Dr. S. A. Oladipo</td>
                <td className="py-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                    Week 3 / 4 Taught (75%)
                  </span>
                </td>
                <td className="py-3 font-bold text-slate-900">88.0%</td>
                <td className="py-3 text-slate-400">Compliant</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FRAUD & ANTI-PROXY MODAL */}
      {isFraudOpen && (
        <FraudMonitoringModal
          alerts={collisionAlerts}
          reviewerId={user.id}
          onClose={() => setIsFraudOpen(false)}
          onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* CLINICAL MEDICAL WAIVERS MODAL */}
      {isMedicalOpen && (
        <MedicalWaiverModal
          reviewerProfileId={user.id}
          onClose={() => setIsMedicalOpen(false)}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
};
