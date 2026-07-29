import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getResources } from '@/lib/resources';
import { isAdmin } from '@/lib/staff';
import AdminHeader from '@/components/admin/AdminHeader';
import ResourcesEditor from '@/components/admin/ResourcesEditor';

export default async function ResourcesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');
  // Studio-wide configuration. The drawer hides the link from restricted
  // staff; this stops a typed URL from getting round that.
  if (!isAdmin(session.sub)) redirect('/admin');

  const resources = await getResources();

  return (
    <>
      <AdminHeader name={session.name} isAdmin />
      <ResourcesEditor initial={resources} />
    </>
  );
}
