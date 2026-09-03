'use client';

import React from 'react';
import QRCode from 'qrcode';
import { ExamDocket } from '@/types';
import { ShieldCheck, AlertTriangle, Printer, X, Award, CheckCircle2, XCircle } from 'lucide-react';

interface ExamDocketModalProps {
  docket: ExamDocket;
  onClose: () => void;
}

export const ExamDocketModal: React.FC<ExamDocketModalProps> = ({ docket, onClose }) => {
  const [qrSvg, setQrSvg] = React.useState<string>('');

  React.useEffect(() => {
    QRCode.toString(
      JSON.stringify({
        docket: docket.docketNumber,
        matric: docket.matricNumber,
        verifiedAt: docket.generatedAt,
        token: docket.verificationToken,
      }),
      {
        type: 'svg',
        margin: 1,
        color: { dark: '#8d4a27', light: '#ffffff' },
      }
    ).then(setQrSvg);
  }, [docket]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white text-zinc-900 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 border border-zinc-200">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-[#432211] text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#e0b899]" />
            <span className="font-bold text-xs">Official CUSTECH Examination Hall Pass & Clearance</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8d4a27] hover:bg-[#a6572e] text-xs font-bold text-white transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Clearance Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCKET BODY */}
        <div className="p-4 sm:p-8 font-serif bg-white" id="printable-docket">
          {/* Institutional Header */}
          <div className="text-center pb-6 border-b-2 border-[#8d4a27]">
            <div className="flex justify-center mb-2">
              <img
                src="/custech-logo-full.png"
                alt="Confluence University of Science and Technology, Osara"
                className="h-12 sm:h-16 object-contain max-w-full"
              />
            </div>
            <p className="text-[11px] sm:text-xs uppercase font-sans font-bold tracking-widest text-[#743c22] mt-1">
              P.M.B. 1040, Osara, Kogi State, Nigeria
            </p>
            <p className="text-[10px] sm:text-xs uppercase font-sans font-semibold text-zinc-600">
              Directorate of Academic Planning &amp; Examination Administration
            </p>
            <div className="mt-3 inline-block px-3 sm:px-4 py-1.5 rounded-full bg-[#fbf5ef] border border-[#ecdacb] font-sans text-[11px] sm:text-xs font-extrabold text-[#8d4a27] tracking-wider text-center">
              OFFICIAL EXAMINATION ATTENDANCE CLEARANCE DOCKET
            </div>
          </div>

          {/* Student Bio-Data & Docket Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 text-xs font-sans border-b border-zinc-200">
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex flex-col xs:flex-row">
                <span className="w-36 text-zinc-500 font-semibold shrink-0">Student Name:</span>
                <span className="font-bold text-zinc-900 uppercase">{docket.studentName}</span>
              </div>
              <div className="flex flex-col xs:flex-row">
                <span className="w-36 text-zinc-500 font-semibold shrink-0">Matriculation No:</span>
                <span className="font-mono font-bold text-[#8d4a27]">{docket.matricNumber}</span>
              </div>
              <div className="flex flex-col xs:flex-row">
                <span className="w-36 text-zinc-500 font-semibold shrink-0">Faculty:</span>
                <span className="font-semibold text-zinc-800">{docket.facultyName}</span>
              </div>
              <div className="flex flex-col xs:flex-row">
                <span className="w-36 text-zinc-500 font-semibold shrink-0">Department:</span>
                <span className="font-semibold text-zinc-800">{docket.departmentName}</span>
              </div>
              <div className="flex flex-col xs:flex-row">
                <span className="w-36 text-zinc-500 font-semibold shrink-0">Level / Session:</span>
                <span className="font-semibold text-zinc-800">
                  {docket.level} Level • {docket.academicSession} ({docket.semester})
                </span>
              </div>
            </div>

            {/* Passport Photo Frame & Verification Stamp */}
            <div className="flex flex-col items-center justify-center pt-2 sm:pt-0">
              <div className="w-24 h-28 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-center p-2 bg-slate-50 font-sans text-[10px] text-slate-500 font-semibold">
                OFFICIAL DIGITAL PASSPORT
              </div>
              <span className="text-[10px] font-mono text-zinc-400 mt-1">
                Docket: #{docket.docketNumber.split('/').pop()}
              </span>
            </div>
          </div>

          {/* Course Attendance Schedule Table */}
          <div className="py-6 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8d4a27] mb-2">
              Verified Course Attendance &amp; Exam Clearance Matrix (75% Statutory Req.)
            </h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border border-slate-200 min-w-[540px]">
                <thead className="bg-slate-100 font-bold text-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border-r border-slate-200">Code</th>
                    <th className="p-2.5 border-r border-slate-200">Course Title</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Units</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Total Sessions</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Attended</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Attendance %</th>
                    <th className="p-2.5 text-center">Clearance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {docket.courses.map((c) => (
                    <tr key={c.courseCode} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-bold font-mono border-r border-slate-200 text-slate-900">{c.courseCode}</td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-800">{c.courseTitle}</td>
                      <td className="p-2.5 font-mono border-r border-slate-200 text-center text-slate-600">{c.creditUnits}</td>
                      <td className="p-2.5 font-mono border-r border-slate-200 text-center text-slate-600">{c.totalSessionsHeld}</td>
                      <td className="p-2.5 font-mono border-r border-slate-200 text-center font-bold text-slate-900">{c.attendedSessions}</td>
                      <td className="p-2.5 font-mono border-r border-slate-200 text-center font-black text-slate-900">{c.attendancePercentage}%</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isEligible ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {c.isEligible ? 'CLEARED' : 'BARRED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification QR & Signatures */}
          <div className="pt-6 border-t-2 border-[#8d4a27] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans text-xs">
            <div className="flex items-center gap-3">
              {qrSvg && (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 border border-slate-200 p-1 rounded-lg shrink-0 [&>svg]:w-full [&>svg]:h-full bg-white shadow-xs"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              )}
              <div className="text-[10px] text-zinc-500">
                <p className="font-bold text-[#743c22]">CUSTECH VERIFIED DOCKET</p>
                <p className="font-mono text-[9px] mt-0.5">{docket.verificationToken}</p>
                <p className="mt-1">Invigilators must scan code to verify authenticity at exam door.</p>
              </div>
            </div>

            <div className="text-right space-y-4">
              <div className="border-b border-[#743c22] w-48 inline-block pb-1 text-center font-bold text-zinc-800">
                Prof. M. O. Yusuf
              </div>
              <p className="text-[10px] text-zinc-500 font-semibold">
                Dean / Authorized Academic Signatory
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
