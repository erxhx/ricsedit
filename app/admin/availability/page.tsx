import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getAvailabilityConfig } from '@/lib/availability-store';
import AdminHeader from '@/components/admin/AdminHeader';
import AvailabilityEditor from '@/components/admin/AvailabilityEditor';

export default async function AvailabilityPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const config = await getAvailabilityConfig();

  return (
    <>
      <AdminHeader name={session.name} />
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 20px', height: 52,
        borderBottom: '1px solid var(--admin-border)',
        position: 'sticky', top: 'calc(52px + var(--admin-safe-top))', background: 'var(--admin-bg)', zIndex: 8,
      }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)' }}>
          Availability
        </span>
      </div>
      <AvailabilityEditor initial={config} />
    </>
  );
}
