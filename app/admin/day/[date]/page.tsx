import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentsForDate } from '@/lib/db';
import { getAvailabilityConfig } from '@/lib/availability-store';
import AdminHeader from '@/components/admin/AdminHeader';
import DaySchedule from '@/components/admin/DaySchedule';

function fmtDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shiftDay(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(y, mo - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/admin/login');

  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect('/admin');

  const [appointments, availability] = await Promise.all([
    dbGetAppointmentsForDate(date),
    getAvailabilityConfig(),
  ]);

  return (
    <>
      <AdminHeader name={session.name} />
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px', height: 44,
        borderBottom: '1px solid var(--admin-border)',
        position: 'sticky', top: 52, background: 'var(--admin-bg)', zIndex: 8,
      }}>
        {/* Back to week */}
        <Link href="/admin?tab=overview&mode=week" style={{
          color: 'var(--admin-text3)', textDecoration: 'none',
          fontFamily: 'var(--font-body)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 4,
          paddingRight: 12,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span>
          <span>Week</span>
        </Link>

        {/* Date + prev/next arrows — centred in remaining space */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Link href={`/admin/day/${shiftDay(date, -1)}`} style={{
            color: 'var(--admin-text3)', textDecoration: 'none', fontSize: 20, lineHeight: 1,
            WebkitTapHighlightColor: 'transparent',
          }}>‹</Link>

          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)', whiteSpace: 'nowrap' }}>
            {fmtDate(date)}
          </span>

          <Link href={`/admin/day/${shiftDay(date, 1)}`} style={{
            color: 'var(--admin-text3)', textDecoration: 'none', fontSize: 20, lineHeight: 1,
            WebkitTapHighlightColor: 'transparent',
          }}>›</Link>
        </div>

        {/* Right spacer to keep date centred */}
        <div style={{ width: 60 }} />
      </div>
      <DaySchedule appointments={appointments} date={date} hoursByDay={availability.days} staffHoursByDay={{ eric: availability.staff.eric.days, livi: availability.staff.livi.days }} barberThuClose={availability.barberThuClose} />
    </>
  );
}
