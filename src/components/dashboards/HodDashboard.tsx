'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, AttendanceRecord } from '@/types';
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Download,
  ShieldAlert,
  HeartPulse,
  Printer,
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

  void refreshTrigger;
  const deptId = user.departmentId || 'dept-csc';
  const department = custechDb.getDepartments().find((d) => d.id === deptId);
  const faculty = department
    ? custechDb.getFaculties().find((f) => f.id === department.facultyId)
    : undefined;

  const allStudents = custechDb.getAllStudentsDetailed().filter(
    (s) => s.profile?.departmentId === deptId
  );
  const allCourses = custechDb.getCoursesWithDetails().filter(
    (c) => c.departmentId === deptId
  );
  const allOfferings = custechDb.getCourseOfferings().filter((o) =>
    allCourses.some((c) => c.id === o.courseId)
  );
  const allSessions = custechDb.getSessions();
  const deptSessions = allSessions.filter((s) =>
    allOfferings.some((o) => o.id === s.courseOfferingId)
  );
  const allRecords = custechDb.getAttendanceRecords();
  const enrollments = custechDb.getFullSnapshot().enrollments;
  const collisionAlerts = custechDb.getDeviceCollisionAlerts();
  const unreviewedCount = collisionAlerts.filter((a) => !a.isReviewed).length;

  // Dynamic course compliance metrics
  const courseRows = allCourses.map((course) => {
    const offering = allOfferings.find((o) => o.courseId === course.id);
    const courseSessions = offering
      ? deptSessions.filter((s) => s.courseOfferingId === offering.id)
      : [];
    const activeSession = courseSessions.find((s) => s.status === 'ACTIVE');
    const enrolledCount = offering
      ? enrollments.filter((e) => e.courseOfferingId === offering.id && e.isActive).length
      : 0;
    const topics = custechDb.getSyllabusForCourse(course.id);
    const taughtCount = topics.filter((t) => t.isCompleted).length;
    const syllabusPct = topics.length > 0 ? Math.round((taughtCount / topics.length) * 100) : 0;

    let avgAttendance = 0;
    if (courseSessions.length > 0 && enrolledCount > 0) {
      const attendedCount = allRecords.filter(
        (r) =>
          courseSessions.some((cs) => cs.id === r.sessionId) &&
          (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED')
      ).length;
      avgAttendance = Math.min(100, Math.round((attendedCount / (courseSessions.length * enrolledCount)) * 100));
    }

    return {
      course,
      offering,
      courseSessions,
      activeSession,
      enrolledCount,
      topicsCount: topics.length,
      taughtCount,
      syllabusPct,
      avgAttendance,
    };
  });

  // Dynamic student risk roster (< 75% across their enrolled dept sessions)
  const studentRiskRows = allStudents
    .map((st) => {
      const stEnrollments = enrollments.filter(
        (e) => e.studentId === st.id && e.isActive && allOfferings.some((o) => o.id === e.courseOfferingId)
      );
      const stSessions = deptSessions.filter((s) =>
        stEnrollments.some((e) => e.courseOfferingId === s.courseOfferingId)
      );
      if (stSessions.length === 0) return null;
      const attended = allRecords.filter(
        (r) =>
          r.studentId === st.id &&
          stSessions.some((s) => s.id === r.sessionId) &&
          (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED')
      ).length;
      const pct = Math.round((attended / stSessions.length) * 100);
      return {
        student: st,
        attended,
        total: stSessions.length,
        pct,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.pct < 75);

  const avgDeptAttendance =
    courseRows.filter((r) => r.courseSessions.length > 0).length > 0
      ? (
          courseRows
            .filter((r) => r.courseSessions.length > 0)
            .reduce((acc, r) => acc + r.avgAttendance, 0) /
          courseRows.filter((r) => r.courseSessions.length > 0).length
        ).toFixed(1)
      : '0.0';

  const avgSyllabusPct =
    courseRows.filter((r) => r.topicsCount > 0).length > 0
      ? (
          courseRows
            .filter((r) => r.topicsCount > 0)
            .reduce((acc, r) => acc + r.syllabusPct, 0) /
          courseRows.filter((r) => r.topicsCount > 0).length
        ).toFixed(1)
      : '0.0';

  const activeSessionsCount = courseRows.filter((r) => Boolean(r.activeSession)).length;
  const hodName = `${user.firstName} ${user.lastName}`.trim() || 'Head of Department';

  // Export Dynamic CSV Report from real database records
  const handleExportCSV = () => {
    const headers = [
      'Matric Number',
      'Student Full Name',
      'Department',
      'Level',
      'Account Status',
      'Sessions Attended',
      'Total Held Sessions',
      'Attendance Percentage',
      'Statutory Exam Status',
    ];

    const dataRows = allStudents.map((st) => {
      const stEnrollments = enrollments.filter((e) => e.studentId === st.id && e.isActive);
      const stSessions = deptSessions.filter((s) =>
        stEnrollments.some((e) => e.courseOfferingId === s.courseOfferingId)
      );
      const totalHeld = stSessions.length;
      const attended = allRecords.filter(
        (r: AttendanceRecord) =>
          r.studentId === st.id &&
          stSessions.some((s) => s.id === r.sessionId) &&
          (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED')
      ).length;
      const pct = totalHeld > 0 ? Math.round((attended / totalHeld) * 100) : 100;
      const clearance = totalHeld === 0 || pct >= 75 ? 'ELIGIBLE' : 'BARRED (< 75%)';
      const name = `${st.profile?.firstName || ''} ${st.profile?.lastName || ''}`.trim() || 'Student';
      const isActive = st.profile?.isActive !== false ? 'Active' : 'Archived';

      return [
        st.matricNumber,
        `"${name}"`,
        `"${st.departmentName || department?.name || 'Department'}"`,
        `${st.currentLevel || 200}L`,
        isActive,
        attended,
        totalHeld,
        `${pct}%`,
        clearance,
      ];
    });

    const csvContent = [headers.join(','), ...dataRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `CUSTECH_${department?.code || 'DEPT'}_Attendance_Register_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Department Governance & Oversight
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {faculty?.name || 'Academic Faculty'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Department of {department?.name || 'Computer Science'} — HOD Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Head of Department: {hodName}. Monitoring {allCourses.length} course(s), {allStudents.length} registered student(s), and lecture delivery compliance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
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
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
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
          <p className="text-3xl font-black text-slate-900 mt-2">{avgDeptAttendance}%</p>
          <p className="text-xs text-slate-400 mt-1">Across {deptSessions.length} held session(s)</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Department Courses</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{allCourses.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeSessionsCount} live lecture session(s) open
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Students Below 75%</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2">{studentRiskRows.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            Out of {allStudents.length} registered student(s)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Average Syllabus Coverage</span>
            <BookOpen className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{avgSyllabusPct}%</p>
          <p className="text-xs text-slate-400 mt-1">Tracked across departmental syllabus modules</p>
        </div>
      </div>

      {/* AT-RISK STUDENTS WARNING LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Exam Ineligibility Risk Roster (&lt; 75% Attendance)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Statutory requirement threshold</span>
        </div>

        {studentRiskRows.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 font-medium">
            All department students with recorded lecture sessions currently meet the 75% statutory exam eligibility threshold.
          </div>
        ) : (
          <div className="space-y-3">
            {studentRiskRows.map((item) => {
              const name = `${item.student.profile?.firstName || ''} ${item.student.profile?.lastName || ''}`.trim() || 'Student';
              return (
                <div
                  key={item.student.id}
                  className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{name}</span>
                      <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {item.student.matricNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                        {item.pct}% Attendance ({item.attended}/{item.total})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Level {item.student.currentLevel || 200} • Below 75% statutory exam clearance threshold.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-amber-700 bg-white px-3 py-1.5 rounded-lg border border-amber-200">
                      Exam Clearance At Risk
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DEPARTMENT COURSE COMPLIANCE TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Department Course Delivery & Attendance Compliance
            </h3>
            <p className="text-xs text-slate-500">
              Live tracking across {allCourses.length} registered course(s) in {department?.name || 'Department'}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Live Registry Sync</span>
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
              {courseRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No courses registered for this department yet.
                  </td>
                </tr>
              ) : (
                courseRows.map((row) => (
                  <tr key={row.course.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-bold text-slate-900 font-mono">{row.course.code}</td>
                    <td className="py-3 font-medium text-slate-800">{row.course.title}</td>
                    <td className="py-3 text-slate-500">
                      {row.course.assignedLecturers.join(', ') || 'Unassigned'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          row.syllabusPct >= 50
                            ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.topicsCount > 0
                          ? `${row.taughtCount} / ${row.topicsCount} Topics (${row.syllabusPct}%)`
                          : 'No topics added'}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {row.courseSessions.length > 0 ? `${row.avgAttendance}%` : '—'}
                    </td>
                    <td className="py-3">
                      {row.activeSession ? (
                        <span className="text-emerald-700 font-bold">● Active Session</span>
                      ) : row.courseSessions.length > 0 ? (
                        <span className="text-slate-600 font-semibold">
                          {row.courseSessions.length} Session(s) Held
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {row.course.scheduleLabel || 'Scheduled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
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
