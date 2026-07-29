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
import { getResources, resourcesFor, appointmentCategories } from '@/lib/resources';
import { getServicesStoreAsync, categoryByServiceName } from '@/lib/services-store';
import { getStaff } from '@/lib/staff';
import type { ServiceCategory } from '@/lib/services';

const CATEGORIES: ServiceCategory[] = ['barber', 'tan', 'wax', 'lashes'];

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

  const toRange = (a: { startTime: string; durationMinutes: number }) => {
    const [h, m] = a.startTime.split(':').map(Number);
    return {
      startMinutes:    h * 60 + (m || 0),
      durationMinutes: a.durationMinutes || 30,
    };
  };

  const ownRanges = appointments
    // Keep everything that actually occupies the staff member's time — including
    // admin "blocked" slots (lunch, personal, closures). Only cancelled frees up.
    .filter((a) => a.staff === staff && a.status !== 'cancelled')
    .map(toRange);

  // ── Shared-resource ranges ────────────────────────────────────────────────
  // Another staff member holding a room this booking needs makes the slot
  // unbookable even though this staff member is free. Without this the slot
  // would show as available and then be refused at checkout by validateSlot.
  //
  // `category` narrows it to what the client is actually booking; absent it,
  // fall back to every category the staff member performs, which can only
  // over-report (Livi's tan would also reserve the wax room).
  const requested = searchParams.get('category') as ServiceCategory | null;
  const categories = requested && CATEGORIES.includes(requested)
    ? [requested]
    : (getStaff(staff)?.categories ?? []);

  const resources = await getResources();
  const wanted = resourcesFor(categories, resources);

  let resourceRanges: ReturnType<typeof toRange>[] = [];
  if (wanted.length > 0) {
    await getServicesStoreAsync();
    const categoryByName = categoryByServiceName();
    resourceRanges = appointments
      .filter((a) => {
        // Mirrors findResourceConflict: a personal block doesn't hold the room,
        // and this staff member's own time is already covered above.
        if (a.staff === staff) return false;
        if (a.status === 'cancelled' || a.status === 'blocked') return false;
        const theirs = appointmentCategories(a, categoryByName);
        return wanted.some((r) => r.categories.some((c) => theirs.includes(c)));
      })
      .map(toRange);
  }

  return NextResponse.json(
    { bookedRanges: [...ownRanges, ...resourceRanges] },
    { headers: CORS },
  );
}
