import Dexie, { type EntityTable } from 'dexie';
import { AssistedReason } from '@/types';

export interface OfflineAttendanceRecord {
  id?: number;
  clientEventId: string;
  sessionId: string;
  matricNumber: string;
  attendancePin: string;
  assistedReason: AssistedReason;
  operatorProfileId: string;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
  retryCount: number;
}

// Define Dexie Database Schema
class CustechOfflineDb extends Dexie {
  attendanceQueue!: EntityTable<OfflineAttendanceRecord, 'id'>;

  constructor() {
    super('CustechAttendanceOfflineDB');
    this.version(1).stores({
      attendanceQueue: '++id, clientEventId, sessionId, matricNumber, syncStatus, createdAt',
    });
  }
}

export const offlineDb = new CustechOfflineDb();

/**
 * Enqueues an attendance record into Dexie IndexedDB when offline or assisted
 */
export async function enqueueOfflineAttendance(item: {
  clientEventId: string;
  sessionId: string;
  matricNumber: string;
  attendancePin: string;
  assistedReason: AssistedReason;
  operatorProfileId: string;
}): Promise<number> {
  const id = await offlineDb.attendanceQueue.add({
    ...item,
    createdAt: new Date().toISOString(),
    syncStatus: 'PENDING',
    retryCount: 0,
  });
  return Number(id);
}

/**
 * Returns count of pending offline records awaiting sync
 */
export async function getPendingOfflineCount(): Promise<number> {
  try {
    return await offlineDb.attendanceQueue
      .where('syncStatus')
      .equals('PENDING')
      .count();
  } catch {
    return 0;
  }
}

/**
 * Retrieves all pending offline attendance records
 */
export async function getPendingOfflineRecords(): Promise<OfflineAttendanceRecord[]> {
  try {
    return await offlineDb.attendanceQueue
      .where('syncStatus')
      .equals('PENDING')
      .toArray();
  } catch {
    return [];
  }
}
