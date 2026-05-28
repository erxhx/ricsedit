import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetClientAppointments } from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import ClientProfile from '@/components/admin/ClientProfile';

export default async function ClientPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const { name } = await params;
  const clientName = decodeURIComponent(name);

  const appointments = await dbGetClientAppointments(clientName);
  if (appointments.length === 0) notFound();

  // Pull contact info from the most recent appointment
  const latest = appointments[0];

  return (
    <>
      <AdminHeader name={session.name} />
      <ClientProfile
        name={clientName}
        email={latest.clientEmail ?? ''}
        phone={latest.clientPhone ?? ''}
        appointments={appointments}
      />
    </>
  );
}
