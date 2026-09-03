'use server';

import { custechDb } from '@/lib/db/repository';
import { ExamDocket, MedicalWaiver, DeviceCollisionAlert, AppNotification } from '@/types';

/**
 * OPTION A: Fetch or generate official Exam Clearance Docket
 */
export async function getStudentExamDocket(studentId: string): Promise<ExamDocket> {
  return custechDb.generateExamDocket(studentId);
}

/**
 * OPTION B: Anti-Fraud Device Abuse & Collision Actions
 */
export async function getDeviceCollisionAlertsAction(sessionId?: string): Promise<DeviceCollisionAlert[]> {
  return custechDb.getDeviceCollisionAlerts(sessionId);
}

export async function resolveDeviceCollisionAction(
  alertId: string,
  reviewerId: string,
  action: 'CLEARED' | 'FLAGGED_DISCIPLINARY'
) {
  return custechDb.resolveDeviceCollisionAlert(alertId, reviewerId, action);
}

/**
 * OPTION C: Centralized University Clinic Medical Waivers
 */
export async function getMedicalWaiversAction() {
  return custechDb.getMedicalWaivers();
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
  return custechDb.submitMedicalWaiver(params);
}

/**
 * OPTION D: In-App Notifications & Forecast
 */
export async function getUserNotificationsAction(userId: string): Promise<AppNotification[]> {
  return custechDb.getNotificationsForUser(userId);
}

export async function markNotificationReadAction(notificationId: string) {
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
