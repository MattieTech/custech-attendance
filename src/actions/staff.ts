'use server';

import { custechDb } from '@/lib/db/repository';
import { requireServerSession } from '@/lib/auth/server-session';

export async function staffCheckInAction(staffId: string, lat?: number, lng?: number) {
  const actor = await requireServerSession();
  if (actor.activeRole === 'STUDENT') {
    throw new Error('Unauthorized: Staff privileges required.');
  }
  const targetId = actor.activeRole === 'SUPER_ADMIN' ? staffId : actor.user.id;
  return custechDb.staffCheckIn(targetId, lat, lng);
}

export async function staffCheckOutAction(staffId: string) {
  const actor = await requireServerSession();
  if (actor.activeRole === 'STUDENT') {
    throw new Error('Unauthorized: Staff privileges required.');
  }
  const targetId = actor.activeRole === 'SUPER_ADMIN' ? staffId : actor.user.id;
  return custechDb.staffCheckOut(targetId);
}
