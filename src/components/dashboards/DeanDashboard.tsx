'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile } from '@/types';
import { CourseManagementTab } from '@/components/admin/CourseManagementTab';
import { Download, BarChart3, BookOpen } from 'lucide-react';

interface DeanDashboardProps {
  user: UserProfile;
}

export const DeanDashboard: React.FC<DeanDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = React.useState<'OVERVIEW' | 'COURSES'>('OVERVIEW');

  const faculties = custechDb.getFaculties();
  const departments = custechDb.getDepartments();
  const allStudents = custechDb.getAllStudentsDetailed();
  const allCourses = custechDb.getCoursesWithDetails();
  const allSessions = custechDb.getSessions();
  const allRecords = custechDb.getAttendanceRecords();

  const userFaculty =
    faculties.find((f) => f.id === user.facultyId) || faculties[0];
  const facultyDepts = user.facultyId
    ? departments.filter((d) => d.facultyId === user.facultyId)
    : departments;
  const facultyDeptIds = new Set(facultyDepts.map((d) => d.id));

  const facultyCourses = allCourses.filter((c) => facultyDeptIds.has(c.departmentId));
  const facultyStudents = allStudents.filter(
    (s) => s.profile?.departmentId && facultyDeptIds.has(s.profile.departmentId)
  );
  const facultyOfferingIds = new Set(
    facultyCourses.map((c) => c.primaryOffering?.id).filter((id): id is string => Boolean(id))
  );
  const facultySessions = allSessions.filter((s) =>
    facultyOfferingIds.has(s.courseOfferingId)
  );
  const facultySessionIds = new Set(facultySessions.map((s) => s.id));
  const facultyRecords = allRecords.filter((r) => facultySessionIds.has(r.sessionId));

  const avgAttendancePct =
    facultySessions.length > 0 && facultyStudents.length > 0
      ? Math.min(
          100,
          Math.round(
            (facultyRecords.filter((r) => r.status !== 'ABSENT').length /
              Math.max(1, facultySessions.length * facultyStudents.length)) *
              1000
          ) / 10
        )
      : 0;

  const handleExportAuditCsv = () => {
    const headers = [
      'Department Code',
      'Department Name',
      'Registered Students',
      'Active Courses',
      'Sessions Held',
      'Attendance Records',
    ];
    const rows = facultyDepts.map((dept) => {
      const dStudents = facultyStudents.filter((s) => s.profile?.departmentId === dept.id);
      const dCourses = facultyCourses.filter((c) => c.departmentId === dept.id);
      const dOffIds = new Set(
        dCourses.map((c) => c.primaryOffering?.id).filter((id): id is string => Boolean(id))
      );
      const dSessions = facultySessions.filter((s) => dOffIds.has(s.courseOfferingId));
      const dSessIds = new Set(dSessions.map((s) => s.id));
      const dRecs = facultyRecords.filter((r) => dSessIds.has(r.sessionId));
      return [
        dept.code,
        `"${dept.name}"`,
        dStudents.length,
        dCourses.length,
        dSessions.length,
        dRecs.length,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `CUSTECH_${userFaculty?.code || 'FACULTY'}_Accreditation_Audit_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Faculty Admin / Dean Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Faculty Administration &amp; Executive Oversight
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {userFaculty?.code || 'CUSTECH'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            {userFaculty?.name || 'Faculty Portal'} — Faculty Admin Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user.firstName} {user.lastName} • Monitoring {facultyDepts.length} departments,{' '}
            {facultyStudents.length} registered students, and {facultyCourses.length} courses.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAuditCsv}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition w-full md:w-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Faculty Audit (CSV)</span>
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#8d4a27]" />
          <span>Faculty Overview &amp; Departments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COURSES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'COURSES'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#8d4a27]" />
          <span>Manage Faculty Courses ({facultyCourses.length})</span>
        </button>
      </div>

      {activeTab === 'COURSES' ? (
        <CourseManagementTab
          actorId={user.id}
          facultyId={user.facultyId}
          facultyName={userFaculty?.name}
        />
      ) : (
        <>
          {/* Faculty KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">
                Faculty Attendance Activity
              </span>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {facultySessions.length > 0 ? `${avgAttendancePct}%` : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {facultyRecords.length} verified check-ins across {facultySessions.length} sessions
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">
                Active Faculty Courses
              </span>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {facultyCourses.filter((c) => c.isActive !== false).length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Across {facultyDepts.length} departments in {userFaculty?.code}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">
                Registered Faculty Students
              </span>
              <p className="text-3xl font-black text-[#8d4a27] mt-2">
                {facultyStudents.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Enrolled in First Semester 2026/2027
              </p>
            </div>
          </div>

          {/* DEPARTMENT BREAKDOWN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Departmental Course &amp; Attendance Breakdown
            </h3>

            <div className="space-y-3">
              {facultyDepts.map((dept) => {
                const deptStudents = facultyStudents.filter(
                  (s) => s.profile?.departmentId === dept.id
                );
                const deptCourses = facultyCourses.filter(
                  (c) => c.departmentId === dept.id
                );
                const deptOffIds = new Set(
                  deptCourses
                    .map((c) => c.primaryOffering?.id)
                    .filter((id): id is string => Boolean(id))
                );
                const deptSessions = facultySessions.filter((s) =>
                  deptOffIds.has(s.courseOfferingId)
                );
                const activeCount = deptSessions.filter((s) => s.status === 'ACTIVE').length;

                return (
                  <div
                    key={dept.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Department of {dept.name} ({dept.code})
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {deptStudents.length} Students • {deptCourses.length} Registered Courses •{' '}
                        {deptSessions.length} Lecture Sessions
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          activeCount > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {activeCount > 0 ? `${activeCount} Live Session` : 'Compliant'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
