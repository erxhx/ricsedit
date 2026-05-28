import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getAppointmentsForDate, getAppointmentsForRange } from '@/lib/admin-mock';
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
    // week param should already be the Sunday; trust it
    weekStart = new Date(y, mo - 1, d);
  } else {
    weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const todayApts = getAppointmentsForDate(todayStr);
  const weekApts = getAppointmentsForRange(
    localDateStr(weekStart),
    localDateStr(weekEnd),
  );

  return (
    <>
      <AdminHeader name={session.name} />
      <DashboardTabs
        todayApts={todayApts}
        weekApts={weekApts}
        today={today}
        weekStart={weekStart}
      />
    </>
  );
}
