import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAllClients } from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import ClientList from '@/components/admin/ClientList';

export default async function ClientsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const clients = await dbGetAllClients();

  return (
    <>
      <AdminHeader name={session.name} />
      <div style={{
        padding: '0 0 8px',
        borderBottom: '1px solid #d4cfc6',
        position: 'sticky', top: 52, background: '#efeae0', zIndex: 8,
      }}>
        <div style={{
          padding: '14px 16px 0',
          fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 500,
          color: '#141210',
        }}>
          Clients
        </div>
      </div>
      <ClientList clients={clients} />
    </>
  );
}
