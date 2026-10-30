'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitAttendanceFromUrl, submitAttendanceByCourseAndCode } from '@/actions/attendance';
import { loginStudentAction } from '@/actions/academic';
import { UserProfile } from '@/types';
import {
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  BookOpen,
  User,
  Key,
  ArrowRight,
  Sparkles,
  RefreshCw,
  School,
} from 'lucide-react';

function AttendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search parameters from scanned camera QR code
  const sessionId = searchParams.get('sessionId') || searchParams.get('session') || '';
  const initialCourse = searchParams.get('course') || searchParams.get('courseCode') || '';
  const code = searchParams.get('code') || '';
  const tw = searchParams.get('tw') || searchParams.get('timestampWindow') || '';
  const nonce = searchParams.get('nonce') || '';
  const sig = searchParams.get('sig') || searchParams.get('signature') || '';

  // Local state
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [matricNumber, setMatricNumber] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [typedCourse, setTypedCourse] = React.useState(initialCourse || 'CSC 201');
  const [typedCode, setTypedCode] = React.useState(code || '');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [status, setStatus] = React.useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [successDetails, setSuccessDetails] = React.useState<{
    studentName?: string;
    matricNumber?: string;
    courseCode?: string;
    courseTitle?: string;
    time?: string;
  } | null>(null);

  // Check if student is already logged in on this browser
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('custech_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
          // If all QR parameters are present, auto-record immediately!
          if (sessionId) {
            autoRecordForLoggedInUser(parsed);
          }
        }
      }
    } catch {
      // Ignored
    }
  }, [sessionId]);

  const autoRecordForLoggedInUser = async (user: UserProfile) => {
    setIsVerifying(true);
    setStatus('LOADING');
    setStatusMessage('Verifying attendance link with CUSTECH Server...');

    try {
      const res = await submitAttendanceFromUrl({
        sessionId,
        courseCode: initialCourse || typedCourse,
        timestampWindow: tw ? Number(tw) : undefined,
        nonce: nonce || undefined,
        signature: sig || undefined,
        code: code || undefined,
        studentProfileId: user.id,
      });

      if (res.success) {
        setStatus('SUCCESS');
        setStatusMessage(res.message);
        setSuccessDetails({
          studentName: `${user.firstName} ${user.lastName}`,
          matricNumber: user.email?.split('@')[0].toUpperCase(),
          courseCode: initialCourse || typedCourse,
          courseTitle: res.courseTitle || 'Undergraduate Lecture',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } else {
        setStatus('ERROR');
        setStatusMessage(res.message);
      }
    } catch {
      setStatus('ERROR');
      setStatusMessage('Network error submitting attendance. Please try entering the code manually.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Quick Login + Attendance submission for students opening camera link on mobile
  const handleQuickLoginAndAttend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMatric = matricNumber.trim().toUpperCase();
    if (!cleanMatric) {
      setStatus('ERROR');
      setStatusMessage('Please enter your Matriculation Number (e.g. 25L1SE0000).');
      return;
    }

    setIsVerifying(true);
    setStatus('LOADING');
    setStatusMessage('Authenticating Matriculation Number...');

    try {
      // 1. Authenticate with CUSTECH Database
      const authRes = await loginStudentAction(cleanMatric, pin || '1234');
      if (!authRes.success || !authRes.profile) {
        setStatus('ERROR');
        setStatusMessage(authRes.error || 'Matriculation number not recognized in CUSTECH registry.');
        setIsVerifying(false);
        return;
      }

      const profile = authRes.profile;
      setCurrentUser(profile);
      try {
        localStorage.setItem('custech_current_user', JSON.stringify(profile));
      } catch {
        // Ignored
      }

      // 2. Submit Attendance
      setStatusMessage('Recording attendance presence...');
      let attendRes;
      if (sessionId) {
        attendRes = await submitAttendanceFromUrl({
          sessionId,
          courseCode: initialCourse || typedCourse,
          timestampWindow: tw ? Number(tw) : undefined,
          nonce: nonce || undefined,
          signature: sig || undefined,
          code: code || typedCode || undefined,
          studentProfileId: profile.id,
        });
      } else {
        attendRes = await submitAttendanceByCourseAndCode(
          typedCourse,
          typedCode || code,
          profile.id
        );
      }

      if (attendRes.success) {
        setStatus('SUCCESS');
        setStatusMessage(attendRes.message);
        setSuccessDetails({
          studentName: `${profile.firstName} ${profile.lastName}`,
          matricNumber: cleanMatric,
          courseCode: initialCourse || typedCourse,
          courseTitle: attendRes.courseTitle || 'Academic Lecture',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } else {
        setStatus('ERROR');
        setStatusMessage(attendRes.message);
      }
    } catch {
      setStatus('ERROR');
      setStatusMessage('Error communicating with CUSTECH attendance registry.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Manual fallback submission with Course Code + Session Code
  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsVerifying(true);
    setStatus('LOADING');
    setStatusMessage('Verifying lecture code...');

    try {
      const res = await submitAttendanceByCourseAndCode(
        typedCourse,
        typedCode,
        currentUser.id
      );

      if (res.success) {
        setStatus('SUCCESS');
        setStatusMessage(res.message);
        setSuccessDetails({
          studentName: `${currentUser.firstName} ${currentUser.lastName}`,
          matricNumber: currentUser.email?.split('@')[0].toUpperCase(),
          courseCode: typedCourse,
          courseTitle: res.courseTitle || 'Academic Lecture',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } else {
        setStatus('ERROR');
        setStatusMessage(res.message);
      }
    } catch {
      setStatus('ERROR');
      setStatusMessage('Network error verifying code.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* CUSTECH Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8d4a27] text-white shadow-md mb-3">
          <School className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          CUSTECH Digital Attendance
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#8d4a27] mt-0.5">
          Confluence University of Science and Technology, Osara
        </p>
      </div>

      {/* Main Attendance Card */}
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-[#8d4a27] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-200">
                Live Classroom Check-in
              </p>
              <h2 className="text-base font-extrabold text-white">
                {initialCourse || typedCourse} Attendance
              </h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-300" />
            Verified
          </span>
        </div>

        <div className="p-6">
          {/* STATE 1: LOADING */}
          {status === 'LOADING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#fbf5ef] border border-[#ecdacb] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#8d4a27] animate-spin" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Validating Presence...</h3>
                <p className="text-xs text-slate-500 mt-1">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* STATE 2: SUCCESS */}
          {status === 'SUCCESS' && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-1">
                  Present Recorded
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Attendance Confirmed!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  {statusMessage || 'Your presence has been successfully registered in the CUSTECH academic registry.'}
                </p>
              </div>

              {/* Verified Details Sheet */}
              {successDetails && (
                <div className="w-full bg-[#fbf5ef] border border-[#ecdacb] rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                    <span className="text-slate-500 font-medium">Student Name</span>
                    <span className="font-extrabold text-slate-900">{successDetails.studentName}</span>
                  </div>
                  {successDetails.matricNumber && (
                    <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                      <span className="text-slate-500 font-medium">Matriculation No.</span>
                      <span className="font-mono font-bold text-[#8d4a27]">{successDetails.matricNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                    <span className="text-slate-500 font-medium">Course Code</span>
                    <span className="font-bold text-slate-900">{successDetails.courseCode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Recorded At</span>
                    <span className="font-mono text-slate-600">{successDetails.time}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full mt-2 py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Go to Student Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATE 3: ERROR WITH RETRY */}
          {status === 'ERROR' && (
            <div className="py-4 space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wide">
                    Verification Notice
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">{statusMessage}</p>
                </div>
              </div>

              {/* Fallback to Manual Code Entry */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#8d4a27]" />
                  Enter Lecture Code Manually
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Course Code (e.g. CSC 201)"
                    value={typedCourse}
                    onChange={(e) => setTypedCourse(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold uppercase bg-white"
                  />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-Character Code (e.g. 7K4P92)"
                    value={typedCode}
                    onChange={(e) => setTypedCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 text-center text-lg font-mono font-black tracking-widest uppercase rounded-lg border border-slate-300 bg-white"
                  />
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={handleManualCodeSubmit}
                      disabled={isVerifying || !typedCode.trim()}
                      className="w-full py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
                    >
                      Retry Attendance
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatus('IDLE')}
                      className="w-full py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition"
                    >
                      Login & Mark Present
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STATE 4: IDLE / FORM */}
          {status === 'IDLE' && (
            <div>
              {currentUser ? (
                /* Student is logged in, confirm their identity & submit */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#fbf5ef] border border-[#ecdacb] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#8d4a27] text-white flex items-center justify-center font-bold text-sm">
                      {currentUser.firstName?.[0]}
                      {currentUser.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Signed In As</p>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {currentUser.firstName} {currentUser.lastName}
                      </h4>
                      <p className="text-xs text-[#8d4a27] font-semibold">
                        {currentUser.email?.split('@')[0].toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Course Code
                      </label>
                      <input
                        type="text"
                        value={typedCourse}
                        onChange={(e) => setTypedCourse(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-sm uppercase text-slate-900"
                      />
                    </div>

                    {code && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Scanned Lecture Code</span>
                        <span className="text-2xl font-mono font-black text-slate-900 tracking-widest">{code}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => autoRecordForLoggedInUser(currentUser)}
                      disabled={isVerifying}
                      className="w-full py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Record My Attendance</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Student is NOT logged in: Quick 1-click Matric Verification */
                <form onSubmit={handleQuickLoginAndAttend} className="space-y-4">
                  <div className="text-center pb-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">
                      Enter your matriculation number to mark presence for:
                    </p>
                    <span className="inline-block mt-1 px-3 py-1 rounded-lg bg-[#fbf5ef] border border-[#ecdacb] text-[#8d4a27] font-extrabold text-sm tracking-wide">
                      {initialCourse || typedCourse}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#8d4a27]" />
                      Matriculation Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 25L1SE0000"
                      value={matricNumber}
                      onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                      disabled={isVerifying}
                      required
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono text-base font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Registered CUSTECH student matriculation number.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#8d4a27]" />
                      Attendance PIN (Optional)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="1234"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      disabled={isVerifying}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1 text-center">
                      Default is 1234 if not customized.
                    </p>
                  </div>

                  {!sessionId && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#8d4a27]" />
                        Course Code & 6-Digit Code
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="CSC 201"
                          value={typedCourse}
                          onChange={(e) => setTypedCourse(e.target.value.toUpperCase())}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold uppercase"
                        />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="7K4P92"
                          value={typedCode}
                          onChange={(e) => setTypedCode(e.target.value.toUpperCase())}
                          className="px-3 py-2 text-xs font-mono font-black text-center tracking-widest uppercase rounded-lg border border-slate-300"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying || !matricNumber.trim()}
                    className="w-full py-3.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isVerifying ? 'Verifying...' : 'Verify Identity & Mark Present'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Confluence University of Science and Technology • Cryptographic Attendance
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AttendPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-5 h-5 text-[#8d4a27] animate-spin" />
            <span className="text-xs font-bold text-slate-700">Loading CUSTECH Attendance Portal...</span>
          </div>
        </div>
      }
    >
      <AttendContent />
    </Suspense>
  );
}
