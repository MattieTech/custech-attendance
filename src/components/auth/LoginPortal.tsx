'use client';

import React from 'react';
import { loginStudent, loginStaff } from '@/lib/auth/auth-service';
import { initialProfiles } from '@/lib/db/initial-data';
import {
  GraduationCap,
  Briefcase,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LoginPortalProps {
  onLoginSuccess: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = React.useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [studentMatric, setStudentMatric] = React.useState('');
  const [studentPassword, setStudentPassword] = React.useState('');
  const [staffIdentifier, setStaffIdentifier] = React.useState('');
  const [staffPassword, setStaffPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = React.useState(true);

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = loginStudent(studentMatric, studentPassword);
      setIsSubmitting(false);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.error || 'Invalid credentials.');
      }
    }, 300);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = loginStaff(staffIdentifier, staffPassword);
      setIsSubmitting(false);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.error || 'Invalid staff credentials.');
      }
    }, 300);
  };

  const handleQuickLogin = (profileId: string) => {
    const profile = initialProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    if (profile.matricNumber) {
      setStudentMatric(profile.matricNumber);
      loginStudent(profile.matricNumber);
      onLoginSuccess();
    } else {
      setStaffIdentifier(profile.staffId || profile.email);
      loginStaff(profile.staffId || profile.email);
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official CUSTECH Brand Banner */}
        <div className="flex justify-center mb-4">
          <img
            src="/custech-logo-full.png"
            alt="Confluence University of Science and Technology, Osara"
            className="h-16 sm:h-20 w-auto object-contain"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Academic Presence Portal
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 font-medium">
          Confluence University of Science &amp; Technology, Osara
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl">
          {/* Dual Portal Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('STUDENT');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${
                activeTab === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-[#8d4a27]" />
              <span>Student Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('STAFF');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${
                activeTab === 'STAFF'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#8d4a27]" />
              <span>Staff &amp; Academic Portal</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Student Login Form */}
          {activeTab === 'STUDENT' && (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Matriculation Number
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="text"
                    required
                    value={studentMatric}
                    onChange={(e) => setStudentMatric(e.target.value)}
                    placeholder="e.g. 25L1CS1001 or DE 25L2CS1028"
                    className="block w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27] focus:border-transparent font-mono uppercase text-slate-900 placeholder:text-slate-400 placeholder:font-sans"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  UTME (e.g. 25L1CS1001) &amp; Direct Entry (e.g. DE 25L2CS1028)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Access Password / Attendance PIN
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27] focus:border-transparent text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#8d4a27] hover:bg-[#743c22] transition shadow-sm disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Authenticating Registry...' : 'Sign In as Student'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Staff & Academic Login Form */}
          {activeTab === 'STAFF' && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Staff ID or University Email
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="text"
                    required
                    value={staffIdentifier}
                    onChange={(e) => setStaffIdentifier(e.target.value)}
                    placeholder="e.g. CUSTECH/ACAD/004 or hod.csc@custech.edu.ng"
                    className="block w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27] focus:border-transparent text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Lecturers, HODs, Deans, and Administrators log in here.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Staff Portal Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27] focus:border-transparent text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#8d4a27] hover:bg-[#743c22] transition shadow-sm disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Verifying Institutional Identity...' : 'Sign In as Staff'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Institutional Multi-Role Notice */}
          <div className="mt-6 p-4 rounded-xl bg-[#fbf5ef] border border-[#ecdacb] text-xs text-[#8d4a27] flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#8d4a27]" />
            <div>
              <p className="font-bold text-sm text-[#8d4a27]">Multi-Role Perspective Notice:</p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Staff with dual appointments (e.g. HOD taking courses) and Students with leadership roles (e.g. Course Rep / Assistant Rep) can seamlessly switch between roles directly in their navbar without logging out.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Testing Personas Drawer */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowDemoDrawer(!showDemoDrawer)}
            className="w-full flex items-center justify-between text-sm font-bold text-slate-800"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8d4a27]" />
              <span>One-Click Test Accounts (Multi-Role Preview)</span>
            </div>
            {showDemoDrawer ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showDemoDrawer && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Dr Adeleke - HOD + Lecturer */}
              <button
                onClick={() => handleQuickLogin('user-hod')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Dr. K. A. Adeleke
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-[#8d4a27]">HOD</span> + <span className="font-semibold text-slate-700">Course Lecturer</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Staff ID: CUSTECH/ACAD/004
                </div>
              </button>

              {/* Prof Yusuf - Dean + Lecturer */}
              <button
                onClick={() => handleQuickLogin('user-dean')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Prof. M. O. Yusuf
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-indigo-700">Dean of Faculty</span> + <span className="font-semibold text-slate-700">Lecturer</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Staff ID: CUSTECH/ACAD/001
                </div>
              </button>

              {/* Ibrahim Aliyu - Student + Course Rep */}
              <button
                onClick={() => handleQuickLogin('user-rep')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Ibrahim Aliyu
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-amber-800">Course Rep</span> + <span className="font-semibold text-slate-700">Student</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Matric: 25L1CS1001
                </div>
              </button>

              {/* Chioma Adebayo - Student + Assistant Course Rep */}
              <button
                onClick={() => handleQuickLogin('user-asst-rep')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Chioma Adebayo
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-amber-800">Asst Course Rep (DE)</span> + <span className="font-semibold text-slate-700">Student</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Matric: DE 25L2CS1028
                </div>
              </button>

              {/* Mohammed Kabir - Student + Dept Rep */}
              <button
                onClick={() => handleQuickLogin('user-dept-rep')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Mohammed Kabir
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-sky-700">Dept Rep (NACOS)</span> + <span className="font-semibold text-slate-700">Student</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Matric: 25L1CS1005
                </div>
              </button>

              {/* Amina Usman - Regular Student */}
              <button
                onClick={() => handleQuickLogin('user-stu-1')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Amina Usman
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Regular Enrolled Student
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Matric: 25L1CS1014
                </div>
              </button>

              {/* Dr. John Doe - Full Lecturer */}
              <button
                onClick={() => handleQuickLogin('user-lecturer-1')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Dr. John Doe
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Senior Course Lecturer
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Staff ID: CUSTECH/ACAD/012
                </div>
              </button>

              {/* Engr Faruq Bello - Super Admin */}
              <button
                onClick={() => handleQuickLogin('user-admin')}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#8d4a27] hover:bg-[#fbf5ef] transition group shadow-sm bg-white"
              >
                <div className="font-bold text-sm text-slate-900 group-hover:text-[#8d4a27]">
                  Engr. Faruq Bello
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Director of ICT / Super Admin
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Staff ID: CUSTECH/ADMIN/001
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
