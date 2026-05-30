import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentsForDate, dbGetAppointmentsForRange } from '@/lib/db';
import { getAvailabilityConfig } from '@/lib/availability-store';
import AdminHeader from '@/components/admin/AdminHeader';
import DashboardTabs from '@/components/admin/DashboardTabs';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // Determine which week to show (default: the week containing today)
  let weekStart: Date;
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    const [y, mo, d] = week.split('-').map(Number);
    // Snap to the Sunday of whichever week this date falls in
    const parsed = new Date(y, mo - 1, d);
    weekStart = new Date(parsed);
    weekStart.setDate(parsed.getDate() - parsed.getDay());
  } else {
    weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const [todayApts, weekApts, availability] = await Promise.all([
    dbGetAppointmentsForDate(todayStr),
    dbGetAppointmentsForRange(localDateStr(weekStart), localDateStr(weekEnd)),
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
        weekStartStr={localDateStr(weekStart)}
        openDays={openDays}
        hoursByDay={availability.days}
      />
    </>
  );
}
