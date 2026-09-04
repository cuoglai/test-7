import { Booking, CTVConflict } from '../types';

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function findCTVConflicts(
  allBookings: Booking[],
  candidate: {
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
    ctvId?: string;
    performerType: 'owner' | 'ctv';
  }
): CTVConflict[] {
  if (candidate.performerType !== 'ctv' || !candidate.ctvId) {
    return [];
  }

  const candidateStart = timeToMinutes(candidate.startTime);
  const candidateEnd = timeToMinutes(candidate.endTime);

  if (candidateEnd <= candidateStart) {
    return [];
  }

  const conflicts: CTVConflict[] = [];

  for (const b of allBookings) {
    if (b.id === candidate.id) continue;
    if (b.status === 'cancelled') continue;
    if (b.date !== candidate.date) continue;
    if (b.performerType !== 'ctv' || b.ctvId !== candidate.ctvId) continue;

    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    // Overlap condition: startA < endB && endA > startB
    if (candidateStart < bEnd && candidateEnd > bStart) {
      const overlapStartMinutes = Math.max(candidateStart, bStart);
      const overlapEndMinutes = Math.min(candidateEnd, bEnd);

      const overlapStart = `${String(Math.floor(overlapStartMinutes / 60)).padStart(2, '0')}:${String(overlapStartMinutes % 60).padStart(2, '0')}`;
      const overlapEnd = `${String(Math.floor(overlapEndMinutes / 60)).padStart(2, '0')}:${String(overlapEndMinutes % 60).padStart(2, '0')}`;

      conflicts.push({
        conflictingBooking: b,
        overlapStart,
        overlapEnd
      });
    }
  }

  return conflicts;
}
