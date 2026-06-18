import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getStaffPermissions } from '@/lib/staff-permissions';
import AdminHeader from '@/components/admin/AdminHeader';
import SettingsPanel from '@/components/admin/SettingsPanel';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const permissions = await getStaffPermissions();

  return (
    <>
      <AdminHeader name={session.name} />
      <SettingsPanel viewerRole={session.role} initialPermissions={permissions} />
    </>
  );
}
