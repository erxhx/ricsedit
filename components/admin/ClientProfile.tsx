'use client';
import Link from 'next/link';
import type { Appointment } from '@/lib/admin-mock';
import { SERVICE_COLORS } from '@/lib/appointment-colors';

function fmtDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:  { label: 'Confirmed',  color: '#3a7a3a' },
  completed:  { label: 'Completed',  color: '#6a6560' },
  cancelled:  { label: 'Cancelled',  color: '#9a3a3a' },
  noshow:     { label: 'No-show',    color: '#8a6020' },
};

export default function ClientProfile({
  name,
  email,
  phone,
  appointments,
}: {
  name: string;
  email: string;
  phone: string;
  appointments: Appointment[];
}) {
  const completed = appointments.filter((a) => a.status !== 'cancelled');
  const totalSpent = completed.reduce((s, a) => s + a.price, 0);
  const lastVisit = appointments[0]?.date ?? null;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Sub-header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 44,
        borderBottom: '1px solid #d4cfc6',
        position: 'sticky', top: 52, background: '#efeae0', zIndex: 8,
      }}>
        <Link href="/admin/clients" style={{
          color: '#6a6560', textDecoration: 'none',
          fontSize: 18, lineHeight: 1,
        }}>‹</Link>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: '#6a6560',
        }}>
          Clients
        </span>
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        {/* Name */}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 600,
          color: '#141210', marginBottom: 4,
        }}>
          {name}
        </div>

        {/* Contact */}
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {email && (
            <a href={`mailto:${email}`} style={{
              fontFamily: 'var(--font-body)', fontSize: 13, color: '#4a4540',
              textDecoration: 'none',
            }}>
              {email}
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} style={{
              fontFamily: 'var(--font-body)', fontSize: 13, color: '#4a4540',
              textDecoration: 'none',
            }}>
              {phone}
            </a>
          )}
          {!email && !phone && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9a9590' }}>
              No contact info
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, background: '#d4cfc6',
          border: '1px solid #d4cfc6', borderRadius: 10, overflow: 'hidden',
          marginBottom: 28,
        }}>
          {[
            { label: 'Visits', value: String(completed.length) },
            { label: 'Total spent', value: `$${totalSpent}` },
            { label: 'Last visit', value: lastVisit ? new Date(lastVisit + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: '#f7f3eb', padding: '14px 12px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600,
                color: '#141210', lineHeight: 1,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#9a9590', marginTop: 5,
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Appointment history */}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#9a9590', marginBottom: 10,
        }}>
          Appointment history
        </div>

        {appointments.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: '#9a9590', padding: '16px 0',
          }}>
            No appointments yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appointments.map((apt) => {
              const color = apt.staff === 'eric'
                ? SERVICE_COLORS.ericBarber
                : SERVICE_COLORS.liviWax;
              const status = STATUS_LABELS[apt.status] ?? { label: apt.status, color: '#9a9590' };
              return (
                <Link
                  key={apt.id}
                  href={`/admin/appointments/${apt.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: '#f7f3eb', border: '1px solid #d4cfc6',
                    borderRadius: 10, padding: '13px 14px',
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 14,
                        color: '#141210', fontWeight: 500,
                      }}>
                        {apt.service}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        color: '#6a6560', flexShrink: 0,
                      }}>
                        ${apt.price}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginTop: 5,
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 12, color: '#6a6560',
                      }}>
                        {fmtDate(apt.date)} · {fmtTime(apt.startTime)}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 11,
                        color: status.color,
                        letterSpacing: '0.04em',
                      }}>
                        {status.label}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
