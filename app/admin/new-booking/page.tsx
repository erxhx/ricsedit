import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getServicesStore } from '@/lib/services-store';
import AdminHeader from '@/components/admin/AdminHeader';
import NewBookingForm from '@/components/admin/NewBookingForm';

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; staff?: string; time?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const { date, staff, time } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const servicesData = getServicesStore();

  return (
    <>
      <AdminHeader name={session.name} />
      <NewBookingForm
        defaultDate={date ?? today}
        defaultStaff={(staff === 'livi' ? 'livi' : 'eric') as 'eric' | 'livi'}
        defaultTime={time}
        servicesData={servicesData}
      />
    </>
  );
}
