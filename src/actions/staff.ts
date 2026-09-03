'use server';

import { custechDb } from '@/lib/db/repository';

export async function staffCheckInAction(staffId: string, lat?: number, lng?: number) {
  return custechDb.staffCheckIn(staffId, lat, lng);
}

export async function staffCheckOutAction(staffId: string) {
  return custechDb.staffCheckOut(staffId);
}
