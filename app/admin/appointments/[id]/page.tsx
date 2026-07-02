import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentById, dbGetAppointmentsByClient } from '@/lib/db';
import { getStaffPermissions, canViewAllRevenue, redactRevenue } from '@/lib/staff-permissions';
import AdminHeader from '@/components/admin/AdminHeader';
import AppointmentDetail from '@/components/admin/AppointmentDetail';
import { RevenueAccessProvider } from '@/components/admin/RevenueAccess';

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const { id } = await params;
  const apt = await dbGetAppointmentById(id);
  if (!apt) notFound();

  const [history, perms] = await Promise.all([
    dbGetAppointmentsByClient(apt.clientName, apt.id),
    getStaffPermissions(),
  ]);

  const canSeeAllRevenue = canViewAllRevenue(session.sub, session.role, perms);
  const [visibleApt] = redactRevenue([apt], session.sub, canSeeAllRevenue);
  const visibleHistory = redactRevenue(history, session.sub, canSeeAllRevenue);

  return (
    <>
      <AdminHeader name={session.name} />
      <RevenueAccessProvider value={{ canSeeAllRevenue, viewerStaff: session.sub }}>
        <AppointmentDetail apt={visibleApt} history={visibleHistory} />
      </RevenueAccessProvider>
    </>
  );
}
