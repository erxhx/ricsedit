import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentsForDate, dbGetAppointmentsForRange } from '@/lib/db';
import { getAvailabilityConfig } from '@/lib/availability-store';
import AdminHeader from '@/components/admin/AdminHeader';
import DashboardTabs from '@/components/admin/DashboardTabs';

function localDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
}

// Compute the Sunday of the week containing a Vancouver date string.
// Works purely on date components to avoid UTC↔Vancouver timezone drift.
function sundayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt  = new Date(y, m - 1, d);          // local midnight — getDay() is correct
  const sun = new Date(y, m - 1, d - dt.getDay());
  return `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`;
}
function addDaysToStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; week?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const { week } = await searchParams;

  const today = new Date();
  const todayStr = localDateStr(today);

  // Determine which week to show (default: the week containing today).
  // Use string-based helpers so we never round-trip through UTC Date methods,
  // which can shift the date by a day when the server (UTC) is ahead of Vancouver.
  const weekStartStr = week && /^\d{4}-\d{2}-\d{2}$/.test(week)
    ? sundayOf(week)
    : sundayOf(todayStr);
  const weekEndStr = addDaysToStr(weekStartStr, 6);

  const [todayApts, weekApts, availability] = await Promise.all([
    dbGetAppointmentsForDate(todayStr),
    dbGetAppointmentsForRange(weekStartStr, weekEndStr),
    getAvailabilityConfig(),
  ]);

  // Derive a simple open/closed map from the availability config
  const openDays: Record<number, boolean> = {};
  for (let i = 0; i <= 6; i++) openDays[i] = availability.days[i] !== null;

  return (
    <>
      <AdminHeader name={session.name} />
      <DashboardTabs
        todayApts={todayApts}
        weekApts={weekApts}
        todayStr={todayStr}
        weekStartStr={weekStartStr}
        openDays={openDays}
        hoursByDay={availability.days}
        staffHoursByDay={Object.fromEntries(
          Object.entries(availability.staff).map(([id, s]) => [id, s.days]),
        )}
        barberThuClose={availability.barberThuClose}
      />
    </>
  );
}
