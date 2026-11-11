'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getSessionDetails,
  submitStudentAttendanceWithMatric,
} from '@/actions/attendance';
import { verifyMatriculationNumberAction } from '@/actions/academic';
import {
  getBiometricPolicyAction,
  enrollStudentFaceAction,
} from '@/actions/biometric';
import { storeSession } from '@/lib/auth/auth-service';
import { FacialVerificationScanner } from '@/components/attendance/FacialVerificationScanner';
import { FaceVerificationSubmission } from '@/types';
import { getClientDeviceTelemetry } from '@/lib/device';
import { OfflineSyncBanner } from '@/components/layout/OfflineSyncBanner';
import { enqueueOfflineAttendance } from '@/lib/offline/dexie-db';
import {
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  User,
  ArrowRight,
  RefreshCw,
  School,
  WifiOff,
  Search,
  Check,
  ScanFace,
  Lock,
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
  faceEnrolled?: boolean;
  faceEnrolledAt?: string;
}

interface EligibilityInfo {
  eligible: boolean;
  reason?: string;
  courseCode?: string;
  courseTitle?: string;
  sessionStatus?: string;
}

function AttendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL parameters from scanned camera QR code
  const sessionId = searchParams.get('sessionId') || searchParams.get('session') || '';
  const initialCourse = searchParams.get('course') || searchParams.get('courseCode') || '';
  const initialCode = searchParams.get('code') || '';

  // Form State
  const [matricInput, setMatricInput] = React.useState('');
  const [attendancePin, setAttendancePin] = React.useState('');
  const [courseInput, setCourseInput] = React.useState(initialCourse || '');
  const [codeInput, setCodeInput] = React.useState(initialCode || '');
  const [sessionCourseTitle, setSessionCourseTitle] = React.useState<string>('');
  const [sessionVenue, setSessionVenue] = React.useState<string>('');
  const [sessionStatusLabel, setSessionStatusLabel] = React.useState<string>('');

  // Verification State
  const [isLookingUpMatric, setIsLookingUpMatric] = React.useState(false);
  const [matricError, setMatricError] = React.useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = React.useState<VerifiedStudent | null>(null);
  const [eligibility, setEligibility] = React.useState<EligibilityInfo | null>(null);

  // Biometric Facial Verification State
  const [requireFacialScan, setRequireFacialScan] = React.useState(true);
  const [biometricMode, setBiometricMode] = React.useState<'NONE' | 'ENROLL' | 'VERIFY'>('NONE');

  // Submission State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'DUPLICATE' | 'OFFLINE_PENDING' | 'ERROR'
  >('IDLE');
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
    facialVerified?: boolean;
    facialConfidence?: number;
  } | null>(null);

  React.useEffect(() => {
    getBiometricPolicyAction()
      .then((policy) => setRequireFacialScan(policy.requireFacialVerification))
      .catch(() => setRequireFacialScan(true));
  }, []);

  // Load session metadata when sessionId is present
  React.useEffect(() => {
    if (!sessionId) return;
    let active = true;
    getSessionDetails(sessionId)
      .then((sess) => {
        if (!active || !sess) return;
        const cCode = sess.courseOffering?.course?.code;
        const cTitle = sess.courseOffering?.course?.title;
        if (cCode && !initialCourse) setCourseInput(cCode);
        if (cTitle) setSessionCourseTitle(cTitle);
        if (sess.venue) setSessionVenue(sess.venue);
        setSessionStatusLabel(sess.status);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sessionId, initialCourse]);

  // Step 1: Matriculation Number & Course Eligibility Verification
  const handleVerifyMatric = React.useCallback(
    async (matricToVerify?: string) => {
      const cleanMatric = (matricToVerify || matricInput).trim().toUpperCase();
      if (!cleanMatric) {
        setMatricError('Please enter your Matriculation Number (e.g. 25L1CS1014).');
        return;
      }

      setIsLookingUpMatric(true);
      setMatricError(null);
      setEligibility(null);
      setBiometricMode('NONE');

      try {
        const res = await verifyMatriculationNumberAction(cleanMatric, {
          sessionId: sessionId || undefined,
          courseCode: (initialCourse || courseInput).trim() || undefined,
        });
        if (res.found && res.student) {
          setVerifiedStudent(res.student);
          setMatricInput(cleanMatric);
          if ('eligibility' in res && res.eligibility) {
            setEligibility(res.eligibility);
          }
          try {
            localStorage.setItem('custech_verified_matric', cleanMatric);
          } catch {
            // Ignored
          }
        } else {
          setVerifiedStudent(null);
          setMatricError(
            res.error ||
              `Matriculation number "${cleanMatric}" was not found in the CUSTECH student registry. Please confirm your number or contact the ICT Administrator.`
          );
        }
      } catch {
        setMatricError('Network error checking matriculation number. Please try again.');
      } finally {
        setIsLookingUpMatric(false);
      }
    },
    [matricInput, sessionId, initialCourse, courseInput]
  );

  // Re-check eligibility when manual courseInput changes while student is already verified
  React.useEffect(() => {
    if (!verifiedStudent) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!sessionId && !courseInput.trim()) {
        if (!cancelled) setEligibility(null);
        return;
      }
      try {
        const res = await verifyMatriculationNumberAction(verifiedStudent.matricNumber, {
          sessionId: sessionId || undefined,
          courseCode: (initialCourse || courseInput).trim() || undefined,
        });
        if (!cancelled && 'eligibility' in res && res.eligibility) {
          setEligibility(res.eligibility);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [verifiedStudent, sessionId, initialCourse, courseInput]);

  // Check remembered student on this device once on mount (only if session belongs to a student)
  React.useEffect(() => {
    let cancelled = false;
    const loadRemembered = async () => {
      try {
        let rememberedMatric = '';
        const sessionRaw = localStorage.getItem('custech_auth_session_v1');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          if (parsed?.user?.matricNumber) {
            rememberedMatric = String(parsed.user.matricNumber).trim().toUpperCase();
          }
        }
        if (!rememberedMatric) {
          rememberedMatric = (localStorage.getItem('custech_verified_matric') || '')
            .trim()
            .toUpperCase();
        }
        if (!rememberedMatric || cancelled) return;

        setMatricInput(rememberedMatric);
        const res = await verifyMatriculationNumberAction(rememberedMatric, {
          sessionId: sessionId || undefined,
          courseCode: initialCourse.trim() || undefined,
        });
        if (!cancelled && res.found && res.student) {
          setVerifiedStudent(res.student);
          if ('eligibility' in res && res.eligibility) {
            setEligibility(res.eligibility);
          }
        }
      } catch {
        // Ignored
      }
    };
    void loadRemembered();
    return () => {
      cancelled = true;
    };
  }, [sessionId, initialCourse]);

  // Step 2: Initiate Facial Scan or Submit Directly with PIN if Disabled
  const handleStartAttendanceConfirmation = () => {
    if (!verifiedStudent) {
      setMatricError('Please verify your matriculation number first.');
      return;
    }

    if (eligibility && !eligibility.eligible) {
      setStatus('ERROR');
      setStatusMessage(
        eligibility.reason || 'You are not registered for this course offering.'
      );
      return;
    }

    if (!sessionId && !courseInput.trim()) {
      setStatus('ERROR');
      setStatusMessage('Please enter the course code before proceeding.');
      return;
    }

    if (!sessionId && !codeInput.trim()) {
      setStatus('ERROR');
      setStatusMessage('Please enter the 6-character lecture code shown on the screen.');
      return;
    }

    if (!requireFacialScan) {
      if (attendancePin.trim().length !== 4) {
        setStatus('ERROR');
        setStatusMessage('Please enter your 4-digit Attendance PIN to verify your identity.');
        return;
      }
      void handleConfirmAttendance();
      return;
    }

    setStatus('IDLE');
    setStatusMessage('');
    if (!verifiedStudent.faceEnrolled) {
      setBiometricMode('ENROLL');
    } else {
      setBiometricMode('VERIFY');
    }
  };

  // Step 3: Confirm Attendance Presence
  const handleConfirmAttendance = async (faceVerification?: FaceVerificationSubmission) => {
    if (!verifiedStudent) {
      setMatricError('Please verify your matriculation number first.');
      return;
    }

    setBiometricMode('NONE');
    setIsSubmitting(true);
    setStatus('LOADING');
    setStatusMessage('Verifying identity & recording attendance...');

    const telemetry = getClientDeviceTelemetry();
    const cleanMatric = verifiedStudent.matricNumber;

    try {
      const res = await submitStudentAttendanceWithMatric({
        matricNumber: cleanMatric,
        attendancePin: attendancePin.trim() || undefined,
        sessionId: sessionId || undefined,
        courseCode: initialCourse || courseInput,
        code: initialCode || codeInput || undefined,
        method: sessionId ? 'DYNAMIC_QR' : 'TEMP_CODE',
        deviceFingerprintHash: telemetry.deviceFingerprintHash,
        userAgent: telemetry.userAgent,
        browser: telemetry.browser,
        os: telemetry.os,
        faceVerification,
      });

      // Restore authenticated STUDENT-only session (replaces any prior admin/lecturer session)
      if (res.restoredSession) {
        storeSession(res.restoredSession);
      }

      if (res.isDuplicate) {
        setStatus('DUPLICATE');
        setStatusMessage(res.message);
        setSuccessData({
          studentName: verifiedStudent.fullName,
          matricNumber: verifiedStudent.matricNumber,
          department: verifiedStudent.departmentName,
          level: verifiedStudent.level,
          courseCode: res.course?.code || initialCourse || courseInput,
          courseTitle: res.course?.title || sessionCourseTitle || 'Academic Lecture',
          venue: res.course?.venue || sessionVenue || 'Lecture Hall',
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
          courseTitle: res.course?.title || sessionCourseTitle || 'Academic Lecture',
          venue: res.course?.venue || sessionVenue || 'Lecture Hall',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          facialVerified: res.record?.facialVerified,
          facialConfidence: res.record?.facialConfidence,
        });
      } else {
        if (res.biometricErrorCode === 'FACE_NOT_ENROLLED') {
          setVerifiedStudent((prev) => (prev ? { ...prev, faceEnrolled: false } : prev));
        }
        setStatus('ERROR');
        setStatusMessage(res.message);
      }
    } catch {
      try {
        const clientEventId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await enqueueOfflineAttendance({
          clientEventId,
          sessionId: sessionId || 'offline_session',
          matricNumber: cleanMatric,
          attendancePin: attendancePin.trim() || codeInput || initialCode || '1234',
          assistedReason: 'No internet / mobile data',
          operatorProfileId: verifiedStudent.profileId,
          courseCode: initialCourse || courseInput,
        });

        setStatus('OFFLINE_PENDING');
        setStatusMessage(
          'Attendance recorded in local offline queue. Will sync automatically upon reconnection.'
        );
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
        setStatusMessage(
          'Connection failed. Please verify your connection or enter the attendance code manually.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayCourseHeader = initialCourse || courseInput || 'Lecture';
  const isBlockedByIneligibility = Boolean(eligibility && !eligibility.eligible);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-3 sm:p-5 overflow-x-hidden">
      {/* Offline Banner */}
      <div className="w-full max-w-lg mb-3">
        <OfflineSyncBanner />
      </div>

      {/* University Branding Header */}
      <div className="text-center mb-4 sm:mb-5 px-2 max-w-lg w-full">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#8d4a27] text-white shadow-md mb-2">
          <School className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight break-words">
          CUSTECH Digital Attendance
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#8d4a27] mt-0.5 break-words">
          Confluence University of Science and Technology, Osara
        </p>
      </div>

      {/* Main Attendance Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="bg-[#8d4a27] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-200">
                Official Attendance Check-In
              </p>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                {displayCourseHeader} Lecture Check-in
              </h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white flex items-center gap-1 shrink-0">
            <ShieldCheck className="w-3 h-3 text-amber-300" />
            <span>Verified</span>
          </span>
        </div>

        <div className="p-4 sm:p-6">
          {/* STATE 1: LOADING */}
          {status === 'LOADING' && (
            <div className="py-10 sm:py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#fbf5ef] border border-[#ecdacb] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#8d4a27] animate-spin" />
              </div>
              <div className="px-2">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Recording Attendance...
                </h3>
                <p className="text-xs text-slate-500 mt-1 break-words">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* STATE 2: SUCCESSFUL ATTENDANCE CONFIRMATION */}
          {status === 'SUCCESS' && successData && (
            <div className="py-3 sm:py-4 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
              </div>

              <div className="w-full px-1">
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-1.5">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
                    Present Recorded
                  </span>
                  {successData.facialVerified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbf5ef] border border-[#ecdacb] text-[#8d4a27] text-[11px] font-bold">
                      <ScanFace className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Biometric Verified
                        {successData.facialConfidence
                          ? ` (${successData.facialConfidence}% Match)`
                          : ''}
                      </span>
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Attendance Confirmed!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 break-words">
                  {statusMessage ||
                    'Your presence has been officially registered in the university attendance database.'}
                </p>
              </div>

              {/* Verified Student & Lecture Details Sheet */}
              <div className="w-full bg-[#fbf5ef] border border-[#ecdacb] rounded-2xl p-3.5 sm:p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-start gap-3 border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Student Name</span>
                  <span className="font-extrabold text-slate-900 text-right break-words min-w-0">
                    {successData.studentName}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3 border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Matriculation No.</span>
                  <span className="font-mono font-bold text-[#8d4a27] text-right break-all">
                    {successData.matricNumber}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3 border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Department &amp; Level</span>
                  <span className="font-semibold text-slate-800 text-right break-words min-w-0">
                    {successData.department} ({successData.level}L)
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3 border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Course Code</span>
                  <span className="font-bold text-slate-900 text-right">
                    {successData.courseCode}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3 border-b border-[#ecdacb]/60 pb-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Lecture Venue</span>
                  <span className="font-medium text-slate-700 text-right break-words min-w-0">
                    {successData.venue}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Timestamp</span>
                  <span className="font-mono text-slate-600">{successData.time}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full min-h-[46px] mt-2 px-4 py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Home Page</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}

          {/* STATE 3: DUPLICATE SUBMISSION PREVENTION */}
          {status === 'DUPLICATE' && successData && (
            <div className="py-3 sm:py-4 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 border-2 border-amber-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
              </div>

              <div className="w-full px-1">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold uppercase tracking-wider mb-1">
                  Already Submitted
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Attendance Already Recorded
                </h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1 break-words">
                  Your attendance for this lecture session was already registered. Duplicate submissions are not allowed.
                </p>
              </div>

              <div className="w-full bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 sm:p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-start gap-3 border-b border-amber-200/60 pb-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Student Name</span>
                  <span className="font-extrabold text-slate-900 text-right break-words min-w-0">
                    {successData.studentName}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3 border-b border-amber-200/60 pb-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Matriculation No.</span>
                  <span className="font-mono font-bold text-[#8d4a27] text-right break-all">
                    {successData.matricNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Course Code</span>
                  <span className="font-bold text-slate-900">{successData.courseCode}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full min-h-[46px] mt-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Home Page</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}

          {/* STATE 4: OFFLINE QUEUED */}
          {status === 'OFFLINE_PENDING' && (
            <div className="py-3 sm:py-4 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 border-2 border-amber-500 flex items-center justify-center shadow-lg">
                <WifiOff className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
              </div>

              <div className="w-full px-1">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold uppercase tracking-wider mb-1">
                  Offline Pending
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Saved in Offline Queue
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 break-words">
                  Your device is currently offline. Your attendance will be automatically synchronized with the university central server when connection is restored.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full min-h-[46px] mt-2 px-4 py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Home Page</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}

          {/* DEFAULT / FORM STATE */}
          {(status === 'IDLE' || status === 'ERROR') && (
            <div className="space-y-5">
              {status === 'ERROR' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words min-w-0">{statusMessage}</span>
                </div>
              )}

              {/* STEP 1: MATRICULATION NUMBER VERIFICATION */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#8d4a27] shrink-0" />
                    <span>Student Matriculation Number</span>
                  </label>
                  {verifiedStudent && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={matricInput}
                      onChange={(e) => {
                        setMatricInput(e.target.value.toUpperCase());
                        if (verifiedStudent) {
                          setVerifiedStudent(null);
                          setEligibility(null);
                        }
                        setMatricError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleVerifyMatric();
                        }
                      }}
                      placeholder="e.g. 25L1CS1014"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] focus:ring-2 focus:ring-[#8d4a27]/20 outline-none uppercase transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleVerifyMatric()}
                    disabled={isLookingUpMatric || !matricInput.trim()}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
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
                    <span className="break-words min-w-0">{matricError}</span>
                  </div>
                )}

                {/* AUTOMATIC STUDENT INFORMATION RETRIEVAL */}
                {verifiedStudent && (
                  <div className="mt-3 p-3.5 sm:p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl animate-fadeIn text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Student Verification Successful</span>
                      </div>
                      {requireFacialScan && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            verifiedStudent.faceEnrolled
                              ? 'bg-white text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {verifiedStudent.faceEnrolled
                            ? 'Face ID Enrolled'
                            : 'Face ID Setup Needed'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Full Name
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm break-words">
                          {verifiedStudent.fullName}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Matriculation No.
                        </span>
                        <span className="font-mono font-bold text-[#8d4a27] break-all">
                          {verifiedStudent.matricNumber}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Department
                        </span>
                        <span className="font-semibold text-slate-800 break-words">
                          {verifiedStudent.departmentName}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Academic Level
                        </span>
                        <span className="font-semibold text-slate-800">
                          {verifiedStudent.level} Level
                        </span>
                      </div>
                    </div>

                    {eligibility && (
                      <div
                        className={`mt-2 p-2.5 rounded-xl border text-[11px] font-semibold flex items-start gap-2 ${
                          eligibility.eligible
                            ? 'bg-white border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {eligibility.eligible ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span className="break-words min-w-0">
                          {eligibility.eligible
                            ? `Registered & Eligible for ${eligibility.courseCode || displayCourseHeader}`
                            : eligibility.reason || 'Not registered for this course.'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 2: LECTURE SESSION DETAILS */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Lecture Details
                </span>

                {sessionId ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-slate-500 font-medium shrink-0">Course</span>
                      <span className="font-mono font-extrabold text-[#8d4a27] text-sm text-right break-words min-w-0">
                        {initialCourse || courseInput}
                        {sessionCourseTitle ? ` — ${sessionCourseTitle}` : ''}
                      </span>
                    </div>
                    {sessionVenue && (
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-slate-500 font-medium shrink-0">Venue</span>
                        <span className="font-semibold text-slate-700 text-right break-words min-w-0">
                          {sessionVenue}
                        </span>
                      </div>
                    )}
                    {initialCode && (
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 font-medium shrink-0">Session Code</span>
                        <span className="font-mono font-bold text-slate-800">{initialCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-slate-500 font-medium shrink-0">Mode</span>
                      <span className="font-bold text-emerald-700">
                        Dynamic QR Code Scan
                        {sessionStatusLabel ? ` (${sessionStatusLabel})` : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Course Code
                      </label>
                      <input
                        type="text"
                        value={courseInput}
                        onChange={(e) => setCourseInput(e.target.value.toUpperCase())}
                        placeholder="e.g. CSC 201"
                        className="w-full min-h-[42px] px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none uppercase"
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
                        className="w-full min-h-[42px] px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* 4-Digit PIN Verification when Facial Scan Policy is Disabled */}
                {!requireFacialScan && verifiedStudent && (
                  <div className="p-3.5 rounded-2xl bg-[#fbf5ef] border border-[#ecdacb] space-y-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#8d4a27]" />
                      <span>4-Digit Attendance PIN (Identity Verification)</span>
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={attendancePin}
                      onChange={(e) => setAttendancePin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full min-h-[44px] px-3.5 py-2 text-center font-mono text-base tracking-[0.4em] font-bold bg-white border border-slate-300 rounded-xl focus:border-[#8d4a27] outline-none"
                    />
                    <p className="text-[11px] text-slate-500">
                      Required to securely verify your identity before recording attendance and opening your student portal.
                    </p>
                  </div>
                )}
              </div>

              {/* STEP 3: BIOMETRIC FACIAL SCANNER OR CONFIRMATION BUTTON */}
              {biometricMode === 'ENROLL' && verifiedStudent && (
                <FacialVerificationScanner
                  mode="ENROLL"
                  requirePinForEnroll
                  studentName={verifiedStudent.fullName}
                  matricNumber={verifiedStudent.matricNumber}
                  onEnrolled={async ({ descriptor, sampleCount, thumbnailDataUrl, attendancePin }) => {
                    const res = await enrollStudentFaceAction({
                      studentIdOrProfileId: verifiedStudent.id,
                      descriptor,
                      sampleCount,
                      actorProfileId: verifiedStudent.profileId,
                      thumbnailDataUrl,
                      attendancePin,
                      requirePinVerification: true,
                    });
                    if (res.success) {
                      setVerifiedStudent((prev) =>
                        prev ? { ...prev, faceEnrolled: true } : prev
                      );
                      setTimeout(() => setBiometricMode('VERIFY'), 900);
                    }
                    return res;
                  }}
                  onCancel={() => setBiometricMode('NONE')}
                />
              )}

              {biometricMode === 'VERIFY' && verifiedStudent && (
                <FacialVerificationScanner
                  mode="VERIFY"
                  studentName={verifiedStudent.fullName}
                  matricNumber={verifiedStudent.matricNumber}
                  onVerified={handleConfirmAttendance}
                  onCancel={() => setBiometricMode('NONE')}
                />
              )}

              {biometricMode === 'NONE' && (
                <>
                  {requireFacialScan && verifiedStudent && !isBlockedByIneligibility && (
                    <div className="p-3 rounded-xl bg-[#fbf5ef] border border-[#ecdacb] text-xs text-slate-700 flex items-start gap-2.5">
                      <ScanFace className="w-4 h-4 text-[#8d4a27] shrink-0 mt-0.5" />
                      <span className="break-words min-w-0">
                        {verifiedStudent.faceEnrolled
                          ? 'Facial verification scan is required to confirm you are marking your own attendance.'
                          : 'First-time Face ID setup (with your 4-digit PIN) + live facial scan is required to prevent proxy attendance.'}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStartAttendanceConfirmation}
                    disabled={isSubmitting || !verifiedStudent || isBlockedByIneligibility}
                    className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-center"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Confirming Presence...</span>
                      </>
                    ) : (
                      <>
                        {requireFacialScan ? (
                          <ScanFace className="w-4 h-4 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        )}
                        <span className="break-words">
                          {requireFacialScan
                            ? verifiedStudent?.faceEnrolled === false
                              ? 'Register Face ID & Verify Attendance'
                              : 'Scan Face & Confirm Attendance'
                            : 'Confirm Attendance Presence'}
                        </span>
                      </>
                    )}
                  </button>
                </>
              )}

              {!verifiedStudent && (
                <p className="text-[11px] text-slate-400 text-center break-words">
                  Enter and verify your Matriculation Number above to check course eligibility and mark attendance.
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
