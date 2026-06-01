import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import AdminHeader from '@/components/admin/AdminHeader';
import WaiverEditor from '@/components/admin/WaiverEditor';

export default async function WaiversPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');
  return (
    <>
      <AdminHeader name={session.name} />
      <WaiverEditor />
    </>
  );
}
