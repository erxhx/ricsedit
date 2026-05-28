import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getServicesStore } from '@/lib/services-store';
import AdminHeader from '@/components/admin/AdminHeader';
import ServicesEditor from '@/components/admin/ServicesEditor';
import Link from 'next/link';

export default async function ServicesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const servicesData = getServicesStore();

  return (
    <>
      <AdminHeader name={session.name} />

      {/* Sub-header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 52,
        borderBottom: '1px solid #d4cfc6',
        position: 'sticky', top: 52, background: '#efeae0', zIndex: 8,
      }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6a6560' }}>
          Services & Pricing
        </span>
      </div>

      <ServicesEditor initial={servicesData} />
    </>
  );
}
