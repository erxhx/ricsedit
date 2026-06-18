import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentsForRange } from '@/lib/db';
import { getStaffPermissions, canViewAllRevenue } from '@/lib/staff-permissions';
import AdminHeader from '@/components/admin/AdminHeader';
import ReportsView from '@/components/admin/ReportsView';
import { RevenueAccessProvider } from '@/components/admin/RevenueAccess';

// Get today's date in Vancouver timezone to avoid UTC midnight drift on the server.
function todayVancouver(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Add n days to a YYYY-MM-DD string using local Date constructor (no UTC drift).
function addDaysToStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  // Derive today + start as Vancouver date strings to avoid UTC→Vancouver offset shifting the window.
  const todayStr = todayVancouver();
  const startStr = addDaysToStr(todayStr, -29); // 30-day window (today − 29 days)
  const [appointments, perms] = await Promise.all([
    dbGetAppointmentsForRange(startStr, todayStr),
    getStaffPermissions(),
  ]);
  const canSeeAllRevenue = canViewAllRevenue(session.sub, session.role, perms);

  return (
    <>
      <AdminHeader name={session.name} />
      <RevenueAccessProvider value={{ canSeeAllRevenue, viewerStaff: session.sub }}>
        <ReportsView appointments={appointments} />
      </RevenueAccessProvider>
    </>
  );
}
