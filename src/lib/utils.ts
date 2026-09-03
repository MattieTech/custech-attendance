import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AttendanceStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatTime(timeString: string): string {
  try {
    if (timeString.includes('T')) {
      const d = new Date(timeString);
      return new Intl.DateTimeFormat('en-NG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    }
    // Handle 'HH:mm' or 'HH:mm:ss'
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
}

/**
 * Calculates academic attendance rate strictly:
 * Attendance % = (Attended Sessions [Present + Late]) / (Eligible Sessions [Total - Cancelled - Excused]) * 100
 */
export function calculateAttendancePercentage(
  presentCount: number,
  lateCount: number,
  absentCount: number,
  excusedCount: number = 0
): { percentage: number; isEligible: boolean; isWarning: boolean; isCritical: boolean } {
  const attended = presentCount + lateCount;
  // Excused sessions are removed from denominator per academic presence standard
  const totalEligible = attended + absentCount;

  if (totalEligible === 0) {
    return { percentage: 100, isEligible: true, isWarning: false, isCritical: false };
  }

  const rawPct = (attended / totalEligible) * 100;
  const percentage = Math.round(rawPct * 10) / 10;

  return {
    percentage,
    isEligible: percentage >= 75.0, // Configurable threshold standard
    isWarning: percentage < 75.0 && percentage >= 65.0,
    isCritical: percentage < 65.0,
  };
}

export function getStatusBadgeVariant(status: AttendanceStatus): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'PRESENT':
      return {
        label: 'Present',
        bg: 'bg-[#fbf5ef]',
        text: 'text-[#8d4a27]',
        border: 'border-[#ecdacb]',
      };
    case 'LATE':
      return {
        label: 'Late',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
      };
    case 'ABSENT':
      return {
        label: 'Absent',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      };
    case 'EXCUSED':
      return {
        label: 'Excused',
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
      };
    case 'PENDING':
    default:
      return {
        label: 'Pending Sync',
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
      };
  }
}
