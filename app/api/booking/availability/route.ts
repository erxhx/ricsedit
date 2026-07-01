/**
 * Public availability endpoint — called by the static editstudio.space booking flow.
 * Returns the booked time ranges for a given date and staff member so the
 * client can grey out overlapping slots in real time.
 *
 * GET /api/booking/availability?date=YYYY-MM-DD&staff=eric|livi
 *
 * Response: { bookedRanges: Array<{ startMinutes: number; durationMinutes: number }> }
 * where startMinutes is minutes from midnight (e.g. 10:30 → 630).
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbGetAppointmentsForDate } from '@/lib/db';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date  = searchParams.get('date');
  const staff = searchParams.get('staff');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !staff) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400, headers: CORS });
  }

  const appointments = await dbGetAppointmentsForDate(date);

  const bookedRanges = appointments
    // Keep everything that actually occupies the staff member's time — including
    // admin "blocked" slots (lunch, personal, closures). Only cancelled frees up.
    .filter((a) => a.staff === staff && a.status !== 'cancelled')
    .map((a) => {
      const [h, m] = a.startTime.split(':').map(Number);
      return {
        startMinutes:    h * 60 + (m || 0),
        durationMinutes: a.durationMinutes || 30,
      };
    });

  return NextResponse.json({ bookedRanges }, { headers: CORS });
}
