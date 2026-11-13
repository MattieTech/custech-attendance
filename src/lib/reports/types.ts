export interface AttendanceReportData {
  schoolName: string;
  subHeader: string;
  facultyName: string;
  departmentName: string;
  courseCode: string;
  courseTitle: string;
  lecturerName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  sessionStatus: string;
  sessionDuration: string;
  topicTitle?: string;
  totalAttendees: number;
  totalEnrolled?: number;
  attendancePercentage?: string;
  generatedAt: string;
  records: Array<{
    sn: number;
    matricNumber: string;
    studentName: string;
    department: string;
    level: string;
    checkInTime: string;
    method: string;
    status: string;
  }>;
}
