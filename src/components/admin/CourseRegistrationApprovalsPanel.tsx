'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import {
  getDatabaseSnapshotAction,
  reviewStudentCourseRegistrationAction,
} from '@/actions/academic';
import { CourseRegistrationStatus } from '@/types';
import {
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  Clock,
  ClipboardCheck,
  AlertCircle,
} from 'lucide-react';

interface CourseRegistrationApprovalsPanelProps {
  departmentId?: string;
  facultyId?: string;
  title?: string;
  subtitle?: string;
  onReviewed?: () => void;
}

export const CourseRegistrationApprovalsPanel: React.FC<
  CourseRegistrationApprovalsPanelProps
> = ({
  departmentId,
  facultyId,
  title = 'Student Course Registration Approvals',
  subtitle = 'Review student course selections, approve registrations, or send correction comments.',
  onReviewed,
}) => {
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | CourseRegistrationStatus>('PENDING');
  const [commentsById, setCommentsById] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [refreshTick, setRefreshTick] = React.useState(0);

  const allRequests = React.useMemo(() => {
    void refreshTick;
    return custechDb.getCourseRegistrationRequests({
      departmentId,
      facultyId,
    });
  }, [departmentId, facultyId, refreshTick]);

  const filteredRequests =
    statusFilter === 'ALL'
      ? allRequests
      : allRequests.filter((r) => r.status === statusFilter);

  const pendingCount = allRequests.filter((r) => r.status === 'PENDING').length;

  const handleReview = async (
    requestId: string,
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'
  ) => {
    const comment = (commentsById[requestId] || '').trim();
    if ((decision === 'CHANGES_REQUESTED' || decision === 'REJECTED') && !comment) {
      setErrorMsg('Please type a comment explaining the required correction or rejection reason.');
      return;
    }

    setBusyId(requestId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await reviewStudentCourseRegistrationAction({
        requestId,
        decision,
        reviewerComment: comment || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to submit review decision.');
        return;
      }

      const snap = await getDatabaseSnapshotAction();
      custechDb.syncClientSnapshot(snap);
      setRefreshTick((t) => t + 1);
      onReviewed?.();

      const label =
        decision === 'APPROVED'
          ? 'Registration approved and student enrolled in selected courses.'
          : decision === 'CHANGES_REQUESTED'
          ? 'Correction comment sent back to the student.'
          : 'Registration rejected with comment.';
      setSuccessMsg(label);
    } catch {
      setErrorMsg('Unexpected error while reviewing registration request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              {title}
            </h3>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-black">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'PENDING', label: `Pending (${pendingCount})` },
              { id: 'CHANGES_REQUESTED', label: 'Corrections' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'REJECTED', label: 'Rejected' },
              { id: 'ALL', label: 'All' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                statusFilter === tab.id
                  ? 'bg-[#8d4a27] text-white border-[#8d4a27]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
          No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase().replace('_', ' ')} student course registration requests found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const totalUnits = req.courses.reduce(
              (acc, c) => acc + (Number(c.creditUnits) || 0),
              0
            );
            const isBusy = busyId === req.id;

            return (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        {req.studentName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs font-bold text-[#8d4a27]">
                        {req.matricNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {req.departmentName} • {req.level}L ({req.semesterType === 'SECOND' ? '2nd' : '1st'} Sem)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Submitted {new Date(req.submittedAt).toLocaleString()} • {req.courses.length} course(s), {totalUnits} total units
                    </p>
                  </div>

                  <span
                    className={`self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'CHANGES_REQUESTED'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                    {req.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                    {req.status === 'CHANGES_REQUESTED' && <MessageSquareWarning className="w-3 h-3" />}
                    {req.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                    <span>{req.status.replace('_', ' ')}</span>
                  </span>
                </div>

                {/* Requested Courses */}
                <div className="flex flex-wrap gap-1.5">
                  {req.courses.map((c) => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                    >
                      <strong className="font-mono text-[#8d4a27]">{c.code}</strong>{' '}
                      <span>— {c.title}</span>{' '}
                      <span className="text-slate-400">({c.creditUnits}U)</span>
                    </span>
                  ))}
                </div>

                {req.studentNote && (
                  <p className="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <strong>Student Note:</strong> {req.studentNote}
                  </p>
                )}

                {req.reviewerComment && (
                  <p className="text-xs text-amber-900 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    <strong>Reviewer Comment ({req.reviewedByName || 'Reviewer'}):</strong>{' '}
                    {req.reviewerComment}
                  </p>
                )}

                {/* Review Controls */}
                <div className="pt-2 border-t border-slate-200/70 space-y-2">
                  <input
                    type="text"
                    value={commentsById[req.id] ?? ''}
                    onChange={(e) =>
                      setCommentsById((prev) => ({
                        ...prev,
                        [req.id]: e.target.value,
                      }))
                    }
                    placeholder="Comment / correction note for student (required for Request Correction or Reject)..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#8d4a27] outline-none"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleReview(req.id, 'APPROVED')}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleReview(req.id, 'CHANGES_REQUESTED')}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <MessageSquareWarning className="w-3.5 h-3.5" />
                      <span>Comment Correction</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleReview(req.id, 'REJECTED')}
                      className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
