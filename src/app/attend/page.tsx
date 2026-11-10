'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  submitStudentAttendanceWithMatric,
  submitAttendanceFromUrl,
} from '@/actions/attendance';
import { verifyMatriculationNumberAction } from '@/actions/academic';
import { getClientDeviceTelemetry } from '@/lib/device';
import { OfflineSyncBanner } from '@/components/layout/OfflineSyncBanner';
import { enqueueOfflineAttendance } from '@/lib/offline/dexie-db';
import {
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  BookOpen,
  User,
  Key,
  ArrowRight,
  RefreshCw,
  School,
  WifiOff,
  Search,
  Check,
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Building,
} from 'lucide-react';

interface VerifiedStudent {
  id: string;
  profileId: string;
  matricNumber: string;
  fullName: string;
  departmentName: string;
  departmentCode: string;
  facultyName: string;
  level: number;
  email: string;
}

function AttendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL parameters from scanned camera QR code
  const sessionId = searchParams.get('sessionId') || searchParams.get('session') || '';
  const initialCourse = searchParams.get('course') || searchParams.get('courseCode') || '';
  const initialCode = searchParams.get('code') || '';
  const tw = searchParams.get('tw') || searchParams.get('timestampWindow') || '';
  const nonce = searchParams.get('nonce') || '';
  const sig = searchParams.get('sig') || searchParams.get('signature') || '';

  // Form State
  const [matricInput, setMatricInput] = React.useState('');
  const [courseInput, setCourseInput] = React.useState(initialCourse || 'CSC 201');
  const [codeInput, setCodeInput] = React.useState(initialCode || '');

  // Verification State (Phase 7)
  const [isLookingUpMatric, setIsLookingUpMatric] = React.useState(false);
  const [matricError, setMatricError] = React.useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = React.useState<VerifiedStudent | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'DUPLICATE' | 'OFFLINE_PENDING' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [successData, setSuccessData] = React.useState<{
    studentName?: string;
    matricNumber?: string;
    department?: string;
    level?: number;
    courseCode?: string;
    courseTitle?: string;
    venue?: string;
    time?: string;
  } | null>(null);

  // Check remembered student on this device
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('custech_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.matricNumber) {
          setMatricInput(parsed.matricNumber);
          handleVerifyMatric(parsed.matricNumber);
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  // Step 1: Matriculation Number Verification (Phase 7.1 & 7.2)
  const handleVerifyMatric = async (matricToVerify?: string) => {
    const cleanMatric = (matricToVerify || matricInput).trim().toUpperCase();
    if (!cleanMatric) {
      setMatricError('Please enter your Matriculation Number (e.g. 25L1SE0000).');
      return;
    }

    setIsLookingUpMatric(true);
    setMatricError(null);

    try {
      const res = await verifyMatriculationNumberAction(cleanMatric);
      if (res.found && res.student) {
        setVerifiedStudent(res.student);
        setMatricInput(cleanMatric);
        try {
          localStorage.setItem('custech_verified_matric', cleanMatric);
        } catch {
          // Ignored
        }
      } else {
        setVerifiedStudent(null);
        setMatricError(
          res.error || `Matriculation number "${cleanMatric}" was not found in the CUSTECH student registry. Please confirm your number or contact the ICT Administrator.`
        );
      }
    } catch {
      setMatricError('Network error checking matriculation number. Please try again.');
    } finally {
      setIsLookingUpMatric(false);
    }
  };

  // Step 2: Confirm Attendance Presence (Phase 7.4 & 7.5)
  const handleConfirmAttendance = async () => {
    if (!verifiedStudent) {
      setMatricError('Please verify your matriculation number first.');
      return;
    }

    setIsSubmitting(true);
    setStatus('LOADING');
    setStatusMessage('Communicating with CUSTECH attendance registry...');

    const telemetry = getClientDeviceTelemetry();
    const cleanMatric = verifiedStudent.matricNumber;

    try {
      const res = await submitStudentAttendanceWithMatric({
        matricNumber: cleanMatric,
        sessionId: sessionId || undefined,
        courseCode: initialCourse || courseInput,
        code: initialCode || codeInput || undefined,
        method: sessionId ? 'DYNAMIC_QR' : 'TEMP_CODE',
        deviceFingerprintHash: telemetry.deviceFingerprintHash,
        userAgent: telemetry.userAgent,
        browser: telemetry.browser,
        os: telemetry.os,
      });

      if (res.isDuplicate) {
        setStatus('DUPLICATE');
        setStatusMessage(res.message);
        setSuccessData({
          studentName: verifiedStudent.fullName,
          matricNumber: verifiedStudent.matricNumber,
          department: verifiedStudent.departmentName,
          level: verifiedStudent.level,
          courseCode: res.course?.code || initialCourse || courseInput,
          courseTitle: res.course?.title || 'Academic Lecture',
          venue: res.course?.venue || 'Lecture Hall',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else if (res.success) {
        setStatus('SUCCESS');
        setStatusMessage(res.message);
        setSuccessData({
          studentName: verifiedStudent.fullName,
          matricNumber: verifiedStudent.matricNumber,
          department: verifiedStudent.departmentName,
          level: verifiedStudent.level,
          courseCode: res.course?.code || initialCourse || courseInput,
          courseTitle: res.course?.title || 'Academic Lecture',
          venue: res.course?.venue || 'Lecture Hall',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        setStatus('ERROR');
        setStatusMessage(res.message);
      }
    } catch {
      // Offline fallback: save locally in Dexie IndexedDB
      try {
        const clientEventId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await enqueueOfflineAttendance({
          clientEventId,
          sessionId: sessionId || 'offline_session',
          matricNumber: cleanMatric,
          attendancePin: codeInput || initialCode || '1234',
          assistedReason: 'No internet / mobile data',
          operatorProfileId: verifiedStudent.profileId,
          courseCode: initialCourse || courseInput,
        });

        setStatus('OFFLINE_PENDING');
        setStatusMessage('Attendance recorded in local offline queue. Will sync automatically upon reconnection.');
        setSuccessData({
          studentName: verifiedStudent.fullName,
          matricNumber: verifiedStudent.matricNumber,
          department: verifiedStudent.departmentName,
          level: verifiedStudent.level,
          courseCode: initialCourse || courseInput,
          courseTitle: 'Pending Server Synchronization',
          venue: 'Classroom',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } catch {
        setStatus('ERROR');
        setStatusMessage('Connection failed. Please verify your connection or enter the attendance code manually.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Offline Banner */}
      <div className="w-full max-w-lg mb-3">
        <OfflineSyncBanner />
      </div>

      {/* University Branding Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8d4a27] text-white shadow-md mb-2.5">
          <School className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          CUSTECH Digital Attendance
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#8d4a27] mt-0.5">
          Confluence University of Science and Technology, Osara
        </p>
      </div>

      {/* Main Attendance Card Container */}
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="bg-[#8d4a27] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-200">
                Official Attendance Check-In
              </p>
              <h2 className="text-base font-extrabold text-white">
                {initialCourse || courseInput} Lecture Check-in
              </h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-300" />
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
                <h3 className="font-extrabold text-slate-900 text-sm">Recording Attendance...</h3>
                <p className="text-xs text-slate-500 mt-1">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* STATE 2: SUCCESSFUL ATTENDANCE CONFIRMATION (Phase 7.5) */}
          {status === 'SUCCESS' && successData && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
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
                  {statusMessage || 'Your presence has been officially registered in the university attendance database.'}
                </p>
              </div>

              {/* Verified Student & Lecture Details Sheet */}
              <div className="w-full bg-[#fbf5ef] border border-[#ecdacb] rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium">Student Name</span>
                  <span className="font-extrabold text-slate-900">{successData.studentName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium">Matriculation No.</span>
                  <span className="font-mono font-bold text-[#8d4a27]">{successData.matricNumber}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium">Department & Level</span>
                  <span className="font-semibold text-slate-800">{successData.department} ({successData.level}L)</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium">Course Code</span>
                  <span className="font-bold text-slate-900">{successData.courseCode}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium">Lecture Venue</span>
                  <span className="font-medium text-slate-700">{successData.venue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Timestamp</span>
                  <span className="font-mono text-slate-600">{successData.time}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full mt-2 py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Return to Student Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATE 3: DUPLICATE SUBMISSION PREVENTION (Phase 7.5 & 8.4) */}
          {status === 'DUPLICATE' && successData && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-amber-600" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold uppercase tracking-wider mb-1">
                  Already Submitted
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Attendance Already Recorded
                </h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1">
                  Your attendance for this lecture session was already registered. Duplicate submissions are not allowed.
                </p>
              </div>

              <div className="w-full bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-amber-200/60 pb-1.5">
                  <span className="text-slate-500 font-medium">Student Name</span>
                  <span className="font-extrabold text-slate-900">{successData.studentName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-amber-200/60 pb-1.5">
                  <span className="text-slate-500 font-medium">Matriculation No.</span>
                  <span className="font-mono font-bold text-[#8d4a27]">{successData.matricNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Course Code</span>
                  <span className="font-bold text-slate-900">{successData.courseCode}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full mt-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* STATE 4: OFFLINE QUEUED */}
          {status === 'OFFLINE_PENDING' && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-500 flex items-center justify-center shadow-lg">
                <WifiOff className="w-10 h-10 text-amber-600" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold uppercase tracking-wider mb-1">
                  Offline Pending
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Saved in Offline Queue
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Your device is currently offline. Your attendance will be automatically synchronized with the university central server when connection is restored.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full mt-2 py-3 rounded-xl bg-[#8d4a27] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                Go to Portal
              </button>
            </div>
          )}

          {/* DEFAULT / FORM STATE: PHASE 7 WORKFLOW */}
          {(status === 'IDLE' || status === 'ERROR') && (
            <div className="space-y-5">
              {status === 'ERROR' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* STEP 1: MATRICULATION NUMBER VERIFICATION (Phase 7.1 & 7.2) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#8d4a27]" />
                    <span>Student Matriculation Number</span>
                  </label>
                  {verifiedStudent && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={matricInput}
                      onChange={(e) => {
                        setMatricInput(e.target.value.toUpperCase());
                        if (verifiedStudent) setVerifiedStudent(null);
                        setMatricError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyMatric();
                        }
                      }}
                      placeholder="e.g. 25L1SE0000"
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] focus:ring-2 focus:ring-[#8d4a27]/20 outline-none uppercase transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyMatric()}
                    disabled={isLookingUpMatric || !matricInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isLookingUpMatric ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>{isLookingUpMatric ? 'Verifying...' : 'Verify'}</span>
                  </button>
                </div>

                {matricError && (
                  <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{matricError}</span>
                  </div>
                )}

                {/* AUTOMATIC STUDENT INFORMATION RETRIEVAL (Phase 7.2) */}
                {verifiedStudent && (
                  <div className="mt-3 p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl animate-fadeIn text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Student Verification Successful</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Full Name</span>
                        <span className="font-extrabold text-slate-900 text-sm">{verifiedStudent.fullName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Matriculation No.</span>
                        <span className="font-mono font-bold text-[#8d4a27]">{verifiedStudent.matricNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
                        <span className="font-semibold text-slate-800">{verifiedStudent.departmentName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Academic Level</span>
                        <span className="font-semibold text-slate-800">{verifiedStudent.level} Level</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: LECTURE SESSION DETAILS & CONFIRMATION (Phase 7.3) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Lecture Details
                </span>

                {sessionId ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Course Code</span>
                      <span className="font-mono font-extrabold text-[#8d4a27] text-sm">{initialCourse || courseInput}</span>
                    </div>
                    {initialCode && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Session Code</span>
                        <span className="font-mono font-bold text-slate-800">{initialCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Mode</span>
                      <span className="font-bold text-emerald-700">Dynamic QR Code Scan</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Course Code
                      </label>
                      <input
                        type="text"
                        value={courseInput}
                        onChange={(e) => setCourseInput(e.target.value.toUpperCase())}
                        placeholder="e.g. CSC 201"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        6-Digit Code
                      </label>
                      <input
                        type="text"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. 7K4P92"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none uppercase"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: CONFIRMATION BUTTON (Phase 7.4) */}
              <button
                type="button"
                onClick={handleConfirmAttendance}
                disabled={isSubmitting || !verifiedStudent}
                className="w-full py-3.5 px-4 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Confirming Presence...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Attendance Presence</span>
                  </>
                )}
              </button>

              {!verifiedStudent && (
                <p className="text-[11px] text-slate-400 text-center">
                  Enter and verify your Matriculation Number above to enable attendance confirmation.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AttendPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <RefreshCw className="w-8 h-8 text-[#8d4a27] animate-spin" />
        </div>
      }
    >
      <AttendContent />
    </Suspense>
  );
}
