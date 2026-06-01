import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentsForRange } from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import ReportsView from '@/components/admin/ReportsView';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const today = new Date();
  // Last 30 days
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  const appointments = await dbGetAppointmentsForRange(localDateStr(start), localDateStr(today));

  return (
    <>
      <AdminHeader name={session.name} />
      <ReportsView appointments={appointments} />
    </>
  );
}
