'use client';

import React from 'react';
import { MedicalWaiver, Student } from '@/types';
import { issueMedicalWaiverAction } from '@/actions/advanced';
import { custechDb } from '@/lib/db/repository';
import { HeartPulse, Plus, CheckCircle2, Calendar, FileText, X, AlertCircle } from 'lucide-react';

interface MedicalWaiverModalProps {
  reviewerProfileId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const MedicalWaiverModal: React.FC<MedicalWaiverModalProps> = ({
  reviewerProfileId,
  onClose,
  onSuccess,
}) => {
  const [waivers, setWaivers] = React.useState<MedicalWaiver[]>(custechDb.getMedicalWaivers());
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState('stu-2'); // Emeka Okonkwo
  const [startDate, setStartDate] = React.useState('2026-08-25');
  const [endDate, setEndDate] = React.useState('2026-08-28');
  const [hospitalName, setHospitalName] = React.useState('CUSTECH University Health Centre, Osara');
  const [diagnosis, setDiagnosis] = React.useState('Acute Malaria & Dehydration with IV Therapy');
  const [doctorName, setDoctorName] = React.useState('Dr. A. B. Ohiani');
  const [doctorLicenseNo, setDoctorLicenseNo] = React.useState('MDCN/64821');
  const [isLoading, setIsLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await issueMedicalWaiverAction({
        studentId: selectedStudentId,
        startDate,
        endDate,
        hospitalName,
        diagnosisSummary: diagnosis,
        doctorName,
        doctorLicenseNo,
        approvedBy: reviewerProfileId,
      });

      setWaivers([res, ...waivers]);
      setFeedback('Medical waiver successfully applied. Overlapping classes across all courses marked as EXCUSED.');
      setIsFormOpen(false);
      onSuccess();
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      alert('Error issuing medical waiver');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">
                CUSTECH Health Centre — Official Medical Waiver Portal
              </h3>
              <p className="text-xs text-blue-200">
                Centralized hospital admission exemptions applied across all course attendance registers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div className="p-3 bg-[#fbf5ef] text-[#8d4a27] text-xs font-bold border-b border-[#ecdacb] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 max-w-md">
              Approved medical certificates automatically adjust the student's attendance denominator so hospital admissions do not penalize exam clearance.
            </p>
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New Waiver</span>
            </button>
          </div>

          {/* Form */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-xs space-y-3">
              <h4 className="font-bold text-blue-950 text-xs uppercase tracking-wider">
                Record Clinical Exemption Certificate
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="stu-2">Emeka Okonkwo (25L1CS1029)</option>
                    <option value="stu-1">Amina Usman (25L1CS1014)</option>
                    <option value="stu-3">Maryam Yakubu (25L1CS1045)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hospital / Clinic Facility
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admission Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Discharge / End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attending Physician
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    MDCN License No.
                  </label>
                  <input
                    type="text"
                    value={doctorLicenseNo}
                    onChange={(e) => setDoctorLicenseNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Diagnosis / Medical Summary
                </label>
                <textarea
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm transition"
                >
                  {isLoading ? 'Applying Exemption...' : 'Certify & Apply Across All Courses'}
                </button>
              </div>
            </form>
          )}

          {/* List of Active Medical Waivers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Verified Medical Exemptions On File ({waivers.length})
            </h4>

            {waivers.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {w.student?.profile?.firstName} {w.student?.profile?.lastName} ({w.student?.matricNumber})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {w.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <strong>Facility:</strong> {w.hospitalName} • <strong>Physician:</strong> {w.doctorName} ({w.doctorLicenseNo})
                </p>
                <p className="text-xs text-slate-500 italic">
                  "{w.diagnosisSummary}"
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-200">
                  <span>Admitted: {w.startDate} to {w.endDate}</span>
                  <span>Affected lectures marked as EXCUSED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
