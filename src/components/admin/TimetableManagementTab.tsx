'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Edit,
  Search,
  User,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  getTimetablesDetailedAction,
  createTimetableAction,
  updateTimetableAction,
  deleteTimetableAction,
  getCourseOfferingsAction,
} from '@/actions/academic';

type DetailedTimetableEntry = Awaited<ReturnType<typeof getTimetablesDetailedAction>>[number];
type DetailedCourseOffering = Awaited<ReturnType<typeof getCourseOfferingsAction>>[number];

interface TimetableManagementTabProps {
  adminUserId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const TimetableManagementTab: React.FC<TimetableManagementTabProps> = ({ adminUserId }) => {
  const [timetables, setTimetables] = useState<DetailedTimetableEntry[]>([]);
  const [offerings, setOfferings] = useState<DetailedCourseOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DetailedTimetableEntry | null>(null);

  // Form State
  const [courseOfferingId, setCourseOfferingId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [venue, setVenue] = useState('Lecture Hall 101');
  const [isRecurring, setIsRecurring] = useState(true);

  // Status
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ttList, offList] = await Promise.all([
        getTimetablesDetailedAction(),
        getCourseOfferingsAction(),
      ]);
      setTimetables(ttList);
      setOfferings(offList);
      if (offList.length > 0 && !courseOfferingId) {
        setCourseOfferingId(offList[0].id);
      }
    } catch (err) {
      console.error('Failed to load timetables', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTimetablesDetailedAction(), getCourseOfferingsAction()])
      .then(([ttList, offList]) => {
        if (cancelled) return;
        setTimetables(ttList);
        setOfferings(offList);
        if (offList.length > 0) {
          setCourseOfferingId((prev) => prev || offList[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load timetables', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenAdd = () => {
    setFormError(null);
    setFormSuccess(null);
    if (offerings.length > 0) setCourseOfferingId(offerings[0].id);
    setDayOfWeek(1);
    setStartTime('09:00');
    setEndTime('11:00');
    setVenue('Lecture Hall 101');
    setIsRecurring(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (entry: DetailedTimetableEntry) => {
    setEditingEntry(entry);
    setFormError(null);
    setFormSuccess(null);
    setCourseOfferingId(entry.courseOfferingId);
    setDayOfWeek(entry.dayOfWeek);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setVenue(entry.venue || entry.venueDisplay || 'Lecture Hall 101');
    setIsRecurring(entry.isRecurring !== false);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (editingEntry) {
        const res = await updateTimetableAction(
          editingEntry.id,
          {
            dayOfWeek,
            startTime,
            endTime,
            venue: venue.trim(),
            isRecurring,
          },
          adminUserId
        );
        if (!res.success) {
          setFormError(res.error || 'Failed to update timetable entry.');
        } else {
          setFormSuccess('Timetable entry updated successfully.');
          await loadData();
          setTimeout(() => setEditingEntry(null), 1000);
        }
      } else {
        const res = await createTimetableAction(
          {
            courseOfferingId,
            dayOfWeek,
            startTime,
            endTime,
            venue: venue.trim(),
            isRecurring,
          },
          adminUserId
        );
        if (!res.success) {
          setFormError(res.error || 'Failed to create timetable entry.');
        } else {
          setFormSuccess('Weekly timetable entry scheduled successfully.');
          await loadData();
          setTimeout(() => setIsAddModalOpen(false), 1000);
        }
      }
    } catch {
      setFormError('An unexpected server error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete the scheduled lecture slot for "${label}"?`)) return;
    try {
      const res = await deleteTimetableAction(id, adminUserId);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || 'Failed to delete timetable entry.');
      }
    } catch {
      alert('Error deleting timetable entry.');
    }
  };

  const filteredTimetables = timetables.filter((tt) => {
    const code = tt.course?.code?.toLowerCase() || '';
    const title = tt.course?.title?.toLowerCase() || '';
    const lecturer = tt.lecturer ? `${tt.lecturer.firstName} ${tt.lecturer.lastName}`.toLowerCase() : '';
    const venueText = (tt.venueDisplay || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      code.includes(query) ||
      title.includes(query) ||
      lecturer.includes(query) ||
      venueText.includes(query);

    const matchesDay = selectedDay === 'ALL' || String(tt.dayOfWeek) === selectedDay;

    return matchesSearch && matchesDay;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
                Academic Scheduling &amp; Logistics
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Recurring Weekly Timetables</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Lecture Timetable &amp; Venue Allocation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure weekly recurring lecture slots across departments, allocate official lecture halls, and link assigned faculty.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Lecture Slot</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by course code, title, venue, or lecturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]/20 focus:border-[#8d4a27]"
            />
          </div>

          <div>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]/20 focus:border-[#8d4a27]"
            >
              <option value="ALL">All Days of the Week</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
            Total Slots Scheduled: <span className="font-bold text-slate-800 ml-1">{timetables.length}</span>
          </div>
        </div>
      </div>

      {/* Timetable Slots Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading timetable directory...
          </div>
        ) : filteredTimetables.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No Timetable Slots Found</p>
            <p className="text-xs text-slate-400 mt-1">
              Adjust your search filters or schedule a new lecture slot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Day &amp; Time</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Assigned Lecturer</th>
                  <th className="py-3 px-4">Recurrence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredTimetables.map((tt) => {
                  const dayName = DAYS_OF_WEEK.find((d) => d.value === tt.dayOfWeek)?.label || `Day ${tt.dayOfWeek}`;
                  const courseCode = tt.course?.code || 'N/A';
                  const courseTitle = tt.course?.title || 'Unknown Course';
                  const lecturerName = tt.lecturer
                    ? `${tt.lecturer.firstName} ${tt.lecturer.lastName}`
                    : 'Unassigned';

                  return (
                    <tr key={tt.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8d4a27]" />
                          <span>{dayName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {tt.startTime} – {tt.endTime}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#8d4a27] bg-[#fbf5ef] px-2 py-0.5 rounded text-[11px] border border-[#ecdacb]">
                            {courseCode}
                          </span>
                          <span className="font-semibold text-slate-800">{courseTitle}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {tt.course?.creditUnits || 2} Units • {tt.course?.level || 200}L
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{tt.venueDisplay || 'Lecture Hall 101'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800">{lecturerName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {tt.isRecurring !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <RotateCcw className="w-2.5 h-2.5" />
                            Weekly Recurring
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Single Session
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(tt)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
                            title="Edit Timetable Entry"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tt.id, `${courseCode} - ${dayName}`)}
                            className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add or Edit Timetable Modal */}
      {(isAddModalOpen || editingEntry) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {editingEntry ? 'Edit Scheduled Lecture Slot' : 'Schedule New Weekly Lecture'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingEntry
                    ? `Updating slot for ${editingEntry.course?.code || 'Course'}`
                    : 'Allocate recurring time, venue, and course offering.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingEntry(null);
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {!editingEntry && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Offering &amp; Assigned Faculty *
                  </label>
                  <select
                    value={courseOfferingId}
                    onChange={(e) => setCourseOfferingId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  >
                    {offerings.map((off) => {
                      const lecturer = off.primaryLecturer
                        ? `${off.primaryLecturer.firstName} ${off.primaryLecturer.lastName}`
                        : 'Unassigned';
                      return (
                        <option key={off.id} value={off.id}>
                          {off.course?.code} — {off.course?.title} ({off.course?.level || 200}L) • {lecturer}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Day of Week *</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lecture Hall / Venue *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics Lecture Hall, LLT, LH 101, Science Lab 2"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-slate-300 text-[#8d4a27] focus:ring-[#8d4a27]"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Recurring weekly lecture throughout the semester (Weeks 1 to 15)
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEntry(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : editingEntry ? 'Save Changes' : 'Schedule Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
