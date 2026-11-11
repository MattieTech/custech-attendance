'use server';

import { custechDb } from '@/lib/db/repository';
import { requireServerSession } from '@/lib/auth/server-session';
import { ExamDocket, MedicalWaiver, DeviceCollisionAlert, AppNotification } from '@/types';

/**
 * OPTION A: Fetch or generate official Exam Clearance Docket
 */
export async function getStudentExamDocket(studentId: string): Promise<ExamDocket> {
  const actor = await requireServerSession();
  const student = custechDb.getStudentById(studentId);
  if (!student) throw new Error('Student not found');

  if (
    (actor.activeRole === 'STUDENT' ||
      actor.activeRole === 'COURSE_REP' ||
      actor.activeRole === 'ASSISTANT_COURSE_REP' ||
      actor.activeRole === 'DEPARTMENT_REP') &&
    student.profileId !== actor.user.id
  ) {
    throw new Error('Unauthorized: You can only generate your own Exam Clearance Docket.');
  }

  return custechDb.generateExamDocket(studentId);
}

/**
 * OPTION B: Anti-Fraud Device Abuse & Collision Actions
 */
export async function getDeviceCollisionAlertsAction(sessionId?: string): Promise<DeviceCollisionAlert[]> {
  const actor = await requireServerSession();
  if (
    actor.activeRole === 'STUDENT' ||
    actor.activeRole === 'COURSE_REP' ||
    actor.activeRole === 'ASSISTANT_COURSE_REP' ||
    actor.activeRole === 'DEPARTMENT_REP'
  ) {
    throw new Error('Unauthorized: Fraud telemetry is restricted to staff and administrators.');
  }
  return custechDb.getDeviceCollisionAlerts(sessionId);
}

export async function resolveDeviceCollisionAction(
  alertId: string,
  _reviewerId: string,
  action: 'CLEARED' | 'FLAGGED_DISCIPLINARY'
) {
  const actor = await requireServerSession();
  const allowed = ['SUPER_ADMIN', 'PRINCIPAL_OFFICER', 'DEAN', 'HOD', 'LECTURER'];
  if (!allowed.includes(actor.activeRole)) {
    throw new Error('Unauthorized: Only lecturers or administrators can resolve alerts.');
  }
  return custechDb.resolveDeviceCollisionAlert(alertId, actor.user.id, action);
}

/**
 * OPTION C: Centralized University Clinic Medical Waivers
 */
export async function getMedicalWaiversAction() {
  const actor = await requireServerSession();
  const waivers = custechDb.getMedicalWaivers();
  if (actor.activeRole === 'STUDENT') {
    const stu = custechDb.getStudentByProfileId(actor.user.id);
    return stu ? waivers.filter((w) => w.studentId === stu.id) : [];
  }
  return waivers;
}

export async function issueMedicalWaiverAction(params: {
  studentId: string;
  startDate: string;
  endDate: string;
  hospitalName: string;
  diagnosisSummary: string;
  doctorName: string;
  doctorLicenseNo: string;
  approvedBy: string;
}): Promise<MedicalWaiver> {
  const actor = await requireServerSession();
  const allowed = ['SUPER_ADMIN', 'PRINCIPAL_OFFICER', 'DEAN', 'HOD', 'LECTURER'];
  if (!allowed.includes(actor.activeRole)) {
    throw new Error('Unauthorized: Only authorized staff/administrators can certify medical waivers.');
  }
  return custechDb.submitMedicalWaiver({
    ...params,
    approvedBy: actor.user.id,
  });
}

/**
 * OPTION D: In-App Notifications & Forecast
 */
export async function getUserNotificationsAction(userId: string): Promise<AppNotification[]> {
  const actor = await requireServerSession();
  const targetId = actor.activeRole === 'SUPER_ADMIN' ? userId : actor.user.id;
  return custechDb.getNotificationsForUser(targetId);
}

export async function markNotificationReadAction(notificationId: string) {
  await requireServerSession();
  return custechDb.markNotificationAsRead(notificationId);
}

export async function computeAttendanceForecastAction(params: {
  currentAttended: number;
  currentAbsent: number;
  remainingLectures: number;
  projectedAttended: number;
}) {
  return custechDb.calculateAttendanceForecast(params);
}
