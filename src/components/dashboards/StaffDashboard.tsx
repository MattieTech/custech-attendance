'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, StaffAttendance } from '@/types';
import { staffCheckInAction, staffCheckOutAction } from '@/actions/staff';
import { formatTime, formatDate } from '@/lib/utils';
import { Clock, CheckCircle2, ArrowRight, Building, MapPin, Calendar } from 'lucide-react';

interface StaffDashboardProps {
  user: UserProfile;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const staff = custechDb.getProfiles().find((p) => p.id === user.id);
  const staffRecords = custechDb.getStaffAttendanceList();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = staffRecords.find((r) => r.staffId === user.id && r.date === todayStr);

  const [record, setRecord] = React.useState<StaffAttendance | undefined>(todayRecord);
  const [isLoading, setIsLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      // Optional geolocation
      let lat: number | undefined;
      let lng: number | undefined;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Geolocation optional fallback
        }
      }

      const res = await staffCheckInAction(user.id, lat, lng);
      setRecord(res);
      setFeedback('Checked in successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error checking in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const res = await staffCheckOutAction(user.id);
      setRecord(res);
      setFeedback('Checked out successfully. Working hours logged.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error checking out');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Staff Profile Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Department of Computer Science
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">Non-Academic Staff Presence</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Senior Executive Officer • Staff ID: CUSTECH/NA/088
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-[#8d4a27] text-white text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* TODAY'S PRESENCE CHECK-IN / CHECK-OUT CARD */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900">
              Today's Duty Log
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Expected Duty: 08:00 – 16:00</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Scheduled Resumption:</span>
                <span className="font-bold text-slate-900">08:00 AM</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Morning Check-In:</span>
                <span className="font-bold text-[#8d4a27]">
                  {record?.checkIn ? formatTime(record.checkIn) : 'Not Logged'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Evening Check-Out:</span>
                <span className="font-bold text-slate-900">
                  {record?.checkOut ? formatTime(record.checkOut) : 'Pending (Close of Day)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            {!record?.checkIn ? (
              <>
                <p className="text-xs text-slate-500 mb-3">
                  Click below to record your official resumption time on campus.
                </p>
                <button
                  onClick={handleCheckIn}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs shadow-xs transition"
                >
                  {isLoading ? 'Verifying...' : 'CHECK IN NOW (08:00 AM)'}
                </button>
              </>
            ) : !record?.checkOut ? (
              <>
                <p className="text-xs text-slate-500 mb-3">
                  You checked in at <strong className="text-[#8d4a27]">{formatTime(record.checkIn)}</strong>. Remember to check out before leaving campus.
                </p>
                <button
                  onClick={handleCheckOut}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-xs transition"
                >
                  {isLoading ? 'Logging...' : 'CHECK OUT'}
                </button>
              </>
            ) : (
              <div className="py-2">
                <CheckCircle2 className="w-10 h-10 text-[#8d4a27] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">
                  Daily Presence Completed
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check-out confirmed. Have a restful evening!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STAFF ATTENDANCE HISTORY */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Monthly Attendance Register
        </h3>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="pb-2">Date</th>
                <th className="pb-2">Check In</th>
                <th className="pb-2">Check Out</th>
                <th className="pb-2">Duration</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffRecords.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 font-medium text-slate-800">{formatDate(r.date)}</td>
                  <td className="py-2.5 font-mono text-slate-500">
                    {r.checkIn ? formatTime(r.checkIn) : '—'}
                  </td>
                  <td className="py-2.5 font-mono text-slate-500">
                    {r.checkOut ? formatTime(r.checkOut) : '—'}
                  </td>
                  <td className="py-2.5 font-mono font-semibold text-slate-700">
                    {r.workingMinutes
                      ? `${Math.floor(r.workingMinutes / 60)}h ${r.workingMinutes % 60}m`
                      : '—'}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
