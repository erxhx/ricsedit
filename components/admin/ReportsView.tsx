'use client';
import type { Appointment } from '@/lib/admin-mock';
import { SERVICE_COLORS } from '@/lib/appointment-colors';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

function isoWeekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const result = new Date(d);
  result.setDate(d.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── sub-components ────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(252,248,240,0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.55)',
      borderRadius: 12,
      boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      padding: '16px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 10,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--admin-muted)', marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function ReportsView({ appointments }: { appointments: Appointment[] }) {
  const active = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'blocked');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Week-over-week revenue ────────────────────────────────────────────────
  const thisWeekStart = isoWeekStart(today);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  const thisWeekStr = localDateStr(thisWeekStart);
  const lastWeekStartStr = localDateStr(lastWeekStart);
  const lastWeekEndStr = localDateStr(lastWeekEnd);

  let thisWeekRevenue = 0;
  let lastWeekRevenue = 0;
  for (const a of active) {
    if (a.date >= thisWeekStr) thisWeekRevenue += a.price;
    else if (a.date >= lastWeekStartStr && a.date <= lastWeekEndStr) lastWeekRevenue += a.price;
  }

  const wowChange = lastWeekRevenue > 0
    ? Math.round((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100)
    : null;

  // ── 30-day total revenue ──────────────────────────────────────────────────
  const thirtyDayRevenue = active.reduce((s, a) => s + a.price, 0);

  // ── Revenue by day of week (bar chart) ───────────────────────────────────
  const revenueByDow: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const a of active) {
    const [y, mo, d] = a.date.split('-').map(Number);
    const dow = new Date(y, mo - 1, d).getDay();
    revenueByDow[dow] += a.price;
  }
  const maxDowRevenue = Math.max(...revenueByDow, 1);

  // ── Staff utilization ─────────────────────────────────────────────────────
  // Count distinct working days (days with at least one active apt) per staff
  const ericDays = new Set<string>();
  const liviDays = new Set<string>();
  let ericApts = 0, liviApts = 0;
  let ericRevenue = 0, liviRevenue = 0;
  for (const a of active) {
    if (a.staff === 'eric') { ericDays.add(a.date); ericApts++; ericRevenue += a.price; }
    if (a.staff === 'livi') { liviDays.add(a.date); liviApts++; liviRevenue += a.price; }
  }
  const ericAptsPerDay = ericDays.size > 0 ? (ericApts / ericDays.size).toFixed(1) : '0';
  const liviAptsPerDay = liviDays.size > 0 ? (liviApts / liviDays.size).toFixed(1) : '0';

  // ── Top services ──────────────────────────────────────────────────────────
  const serviceCount: Record<string, { count: number; revenue: number }> = {};
  for (const a of active) {
    if (!serviceCount[a.service]) serviceCount[a.service] = { count: 0, revenue: 0 };
    serviceCount[a.service].count++;
    serviceCount[a.service].revenue += a.price;
  }
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);
  const maxServiceCount = Math.max(...topServices.map(([, v]) => v.count), 1);

  // ── New vs returning ──────────────────────────────────────────────────────
  // Look at all 30-day clients; clients whose first appointment is also in the 30-day window are "new"
  const startDateStr = localDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29));
  const clientFirstSeen: Record<string, string> = {};
  // We only have 30-day data here — so "new" = clients who appear exactly once in the period
  // with no prior visits detectable. We approximate: count unique clients in this 30-day window.
  const clientDates: Record<string, string[]> = {};
  for (const a of active) {
    if (!clientDates[a.clientName]) clientDates[a.clientName] = [];
    clientDates[a.clientName].push(a.date);
  }

  // A client is "new" if their first date in this window equals their earliest known date
  // (since we only have 30 days of data, we flag clients with only one distinct date as potentially new)
  let newClients = 0, returningClients = 0;
  for (const [, dates] of Object.entries(clientDates)) {
    const sorted = [...new Set(dates)].sort();
    // If the earliest visit is at the very start of the 30-day window it's likely a returning client,
    // but we can't know for sure without full history. Use visit frequency as proxy:
    // clients with only 1 visit in the window are "new", 2+ are "returning".
    if (sorted.length === 1) newClients++;
    else returningClients++;
  }
  const totalUniqueClients = newClients + returningClients;

  // ── Cancellation rate ─────────────────────────────────────────────────────
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const totalApts = appointments.length;
  const cancelRate = totalApts > 0 ? Math.round(cancelled / totalApts * 100) : 0;

  return (
    <div style={{ padding: '24px 20px 120px' }}>

      {/* Heading */}
      <h1 style={{
        fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
        color: 'var(--admin-text)', margin: '0 0 4px', letterSpacing: '-0.01em',
      }}>
        Reports
      </h1>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginBottom: 24, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Last 30 days
      </div>

      {/* ── Week over week ────────────────────────────────────────────────── */}
      <SectionTitle>Revenue — This Week vs Last Week</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              This week
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 500, color: 'var(--admin-text)', letterSpacing: '-0.02em' }}>
              {fmtMoney(thisWeekRevenue)}
            </div>
            {wowChange !== null && (
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 11, marginTop: 4,
                color: wowChange >= 0 ? '#4a9b6f' : '#b03030',
              }}>
                {wowChange >= 0 ? '+' : ''}{wowChange}% vs last week
              </div>
            )}
          </div>
          <div style={{ width: 1, background: 'var(--admin-border)', margin: '0 20px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Last week
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 500, color: 'var(--admin-text)', letterSpacing: '-0.02em' }}>
              {fmtMoney(lastWeekRevenue)}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 4 }}>
              30-day total: {fmtMoney(thirtyDayRevenue)}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Revenue by day of week ────────────────────────────────────────── */}
      <SectionTitle>Revenue by Day of Week (30 days)</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
          {DAY_LABELS.map((label, dow) => {
            const pct = revenueByDow[dow] / maxDowRevenue;
            const isToday = today.getDay() === dow;
            return (
              <div key={dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: isToday ? 'var(--admin-text)' : 'var(--admin-muted)', letterSpacing: '0.04em' }}>
                  {revenueByDow[dow] > 0 ? `$${revenueByDow[dow]}` : ''}
                </div>
                <div style={{
                  width: '100%', borderRadius: 3,
                  height: `${Math.max(pct * 52, revenueByDow[dow] > 0 ? 4 : 0)}px`,
                  background: isToday ? SERVICE_COLORS.ericBarber : 'var(--admin-border)',
                  transition: 'height 0.3s ease',
                }} />
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: isToday ? 'var(--admin-text)' : 'var(--admin-muted)', letterSpacing: '0.04em', fontWeight: isToday ? 600 : 400 }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Staff utilization ─────────────────────────────────────────────── */}
      <SectionTitle>Staff — Last 30 Days</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { label: 'Eric', color: SERVICE_COLORS.ericBarber, days: ericDays.size, apts: ericApts, revenue: ericRevenue, aptsPerDay: ericAptsPerDay },
            { label: 'Livi', color: SERVICE_COLORS.liviWax,    days: liviDays.size, apts: liviApts, revenue: liviRevenue, aptsPerDay: liviAptsPerDay },
          ].map(({ label, color, days, apts, revenue, aptsPerDay }, i) => (
            <div key={label} style={{ flex: 1, paddingLeft: i === 1 ? 20 : 0 }}>
              {i === 1 && <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--admin-border)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--admin-text)' }}>{label}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <StatRow label="Revenue" value={fmtMoney(revenue)} />
                <StatRow label="Appointments" value={String(apts)} />
                <StatRow label="Working days" value={String(days)} />
                <StatRow label="Apts/day" value={aptsPerDay} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Top services ──────────────────────────────────────────────────── */}
      <SectionTitle>Top Services</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        {topServices.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>No data</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topServices.map(([name, { count, revenue }]) => {
              const barPct = count / maxServiceCount * 100;
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
                      {name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', flexShrink: 0 }}>
                      {count}× · {fmtMoney(revenue)}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--admin-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: 'var(--admin-text)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── New vs returning clients + cancel rate ────────────────────────── */}
      <SectionTitle>Clients</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Unique clients
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 500, color: 'var(--admin-text)' }}>
              {totalUniqueClients}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>New</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: '#4a9b6f' }}>{newClients}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Returning</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--admin-text)' }}>{returningClients}</div>
              </div>
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--admin-border)', margin: '0 20px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Cancellation rate
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 500, color: cancelRate >= 20 ? '#b03030' : cancelRate >= 10 ? '#b5824a' : 'var(--admin-text)' }}>
              {cancelRate}%
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 8 }}>
              {cancelled} of {totalApts} apts
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
