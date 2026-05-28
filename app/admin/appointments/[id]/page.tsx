import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getAppointmentById, getAppointmentsByClient } from '@/lib/admin-mock';
import AdminHeader from '@/components/admin/AdminHeader';
import AppointmentDetail from '@/components/admin/AppointmentDetail';

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const { id } = await params;
  const apt = getAppointmentById(id);
  if (!apt) notFound();

  const history = getAppointmentsByClient(apt.clientName, apt.id);

  return (
    <>
      <AdminHeader name={session.name} />
      <AppointmentDetail apt={apt} history={history} />
    </>
  );
}
