'use client';
import { useState, useEffect } from 'react';
import type { Appointment } from '@/lib/admin-mock';
import { STAFF as ROSTER, STAFF_COLORS } from '@/lib/staff';
import { useRevenueAccess } from './RevenueAccess';

// ── types ─────────────────────────────────────────────────────────────────────
type Range = 'today' | 'week' | 'month' | '3months';

const RANGE_LABELS: Record<Range, string> = {
  today:   'Today',
  week:    'This Week',
  month:   'Last 30 Days',
  '3months': 'Last 3 Months',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

function localDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
}

function getRangeStart(range: Range, today: Date): Date {
  const d = new Date(today);
  switch (range) {
    case 'today':   return d;
    case 'week':    d.setDate(d.getDate() - d.getDay()); return d;
    case 'month':   d.setDate(d.getDate() - 29); return d;
    case '3months': d.setDate(d.getDate() - 89); return d;
  }
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── sub-components ────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  // Opaque themed surface — content cards don't get glass (that's reserved
  // for floating chrome), and hardcoded light backgrounds break dark mode.
  return (
    <div style={{
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function ReportsView({ appointments: initialAppointments }: { appointments: Appointment[] }) {
  const { canSeeAllRevenue, viewerStaff } = useRevenueAccess();
  const [range, setRange]   = useState<Range>('month');
  const [apts,  setApts]    = useState<Appointment[]>(initialAppointments);
  const [loading, setLoading]       = useState(false);
  const [compApts, setCompApts]     = useState<Appointment[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch new data whenever range changes (skip initial 'month' — already have server data)
  useEffect(() => {
    if (range === 'month' && apts === initialAppointments) return;
    const start = getRangeStart(range, today);
    setLoading(true);
    fetch(`/api/admin/appointments?start=${localDateStr(start)}&end=${localDateStr(today)}`)
      .then(r => r.json())
      .then(data => setApts(Array.isArray(data) ? data : []))
      .catch(() => setApts([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Fetch the equivalent prior period for the comparison card (month / 3months only)
  useEffect(() => {
    if (range !== 'month' && range !== '3months') { setCompApts([]); return; }
    const days      = range === 'month' ? 30 : 90;
    const prevEnd   = new Date(today); prevEnd.setDate(today.getDate() - days);
    const prevStart = new Date(today); prevStart.setDate(today.getDate() - days * 2 + 1);
    setLoadingComp(true);
    fetch(`/api/admin/appointments?start=${localDateStr(prevStart)}&end=${localDateStr(prevEnd)}`)
      .then(r => r.json())
      .then(d => setCompApts(Array.isArray(d) ? d : []))
      .catch(() => setCompApts([]))
      .finally(() => setLoadingComp(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // When the viewer can't see studio-wide revenue, scope every figure on this
  // page to their own appointments.
  const scopedApts = canSeeAllRevenue ? apts : apts.filter(a => a.staff === viewerStaff);
  const scopedComp = canSeeAllRevenue ? compApts : compApts.filter(a => a.staff === viewerStaff);

  const active = scopedApts.filter(a => a.status !== 'cancelled' && a.status !== 'blocked');

  // ── Total revenue ─────────────────────────────────────────────────────────
  const totalRevenue = active.reduce((s, a) => s + a.price, 0);

  // ── Period-over-period comparison (shown for month & 3months) ───────────────
  const compActive  = scopedComp.filter(a => a.status !== 'cancelled' && a.status !== 'blocked');
  const compRevenue = compActive.reduce((s, a) => s + a.price, 0);
  const pctChange   = compRevenue > 0
    ? Math.round((totalRevenue - compRevenue) / compRevenue * 100)
    : null;
  const compLabel   = range === '3months' ? 'Previous 3 Months' : 'Previous 30 Days';

  // ── Revenue by day of week ────────────────────────────────────────────────
  const revenueByDow: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const a of active) {
    const [y, mo, d] = a.date.split('-').map(Number);
    revenueByDow[new Date(y, mo - 1, d).getDay()] += a.price;
  }
  const maxDowRevenue = Math.max(...revenueByDow, 1);

  // ── Staff stats (one entry per roster member; just the viewer when restricted) ─
  const staffRoster = canSeeAllRevenue ? ROSTER : ROSTER.filter(m => m.id === viewerStaff);
  const staffStats = staffRoster.map((m) => {
    const days = new Set<string>();
    let apts = 0, revenue = 0;
    for (const a of active) {
      if (a.staff === m.id) { days.add(a.date); apts++; revenue += a.price; }
    }
    return {
      id: m.id, label: m.name, color: m.color,
      days: days.size, apts, revenue,
      aptsPerDay: days.size > 0 ? (apts / days.size).toFixed(1) : '0',
    };
  });

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
  const clientDates: Record<string, string[]> = {};
  for (const a of active) {
    if (!clientDates[a.clientName]) clientDates[a.clientName] = [];
    clientDates[a.clientName].push(a.date);
  }
  let newClients = 0, returningClients = 0;
  for (const [, dates] of Object.entries(clientDates)) {
    const sorted = [...new Set(dates)].sort();
    if (sorted.length === 1) newClients++;
    else returningClients++;
  }
  const totalUniqueClients = newClients + returningClients;

  // ── Cancellation rate ─────────────────────────────────────────────────────
  const cancelled  = scopedApts.filter(a => a.status === 'cancelled').length;
  const totalApts  = scopedApts.filter(a => a.status !== 'blocked').length;
  const cancelRate = totalApts > 0 ? Math.round(cancelled / totalApts * 100) : 0;

  const showWoW = range === 'month' || range === '3months';

  return (
    <div style={{ padding: '24px 20px 120px' }}>

      {/* Heading */}
      <h1 style={{
        fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
        color: 'var(--admin-text)', margin: '0 0 16px', letterSpacing: '-0.01em',
      }}>
        Reports
      </h1>

      {!canSeeAllRevenue && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', margin: '-8px 0 16px' }}>
          Showing your own numbers.
        </div>
      )}

      {/* ── Range selector ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['today', 'week', 'month', '3months'] as Range[]).map((r) => {
          const active = range === r;
          return (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 10,
                border: active ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)',
                background: active ? 'var(--admin-text-tint)' : 'var(--admin-card)',
                fontFamily: 'var(--font-body)', fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--admin-text)' : 'var(--admin-text2)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          );
        })}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
          Loading…
        </div>
      )}

      {!loading && (
        <>
          {/* ── Period-over-period (month / 3months only) ─────────────────── */}
          {showWoW && (
            <>
              <SectionTitle>Revenue — {RANGE_LABELS[range]} vs {compLabel}</SectionTitle>
              <Card style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 0 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{RANGE_LABELS[range]}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 500, color: 'var(--admin-text)', letterSpacing: '-0.02em' }}>{fmtMoney(totalRevenue)}</div>
                    {pctChange !== null && (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, marginTop: 4, color: pctChange >= 0 ? 'var(--admin-call-text)' : 'var(--admin-error)' }}>
                        {pctChange >= 0 ? '+' : ''}{pctChange}% vs prior period
                      </div>
                    )}
                  </div>
                  <div style={{ width: 1, background: 'var(--admin-border)', margin: '0 20px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{compLabel}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 500, color: 'var(--admin-text)', letterSpacing: '-0.02em' }}>
                      {loadingComp ? '—' : fmtMoney(compRevenue)}
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ── Total revenue (today / week only) ─────────────────────────── */}
          {!showWoW && (
            <>
              <SectionTitle>Revenue — {RANGE_LABELS[range]}</SectionTitle>
              <Card style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 36, fontWeight: 500, color: 'var(--admin-text)', letterSpacing: '-0.02em' }}>
                  {fmtMoney(totalRevenue)}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', marginTop: 6 }}>
                  {active.length} appointment{active.length !== 1 ? 's' : ''}
                </div>
              </Card>
            </>
          )}

          {/* ── Revenue by day of week ────────────────────────────────────── */}
          <SectionTitle>Revenue by Day of Week</SectionTitle>
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
                      background: isToday ? STAFF_COLORS.ericBarber : 'var(--admin-btn-border)',
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

          {/* ── Staff stats ───────────────────────────────────────────────── */}
          <SectionTitle>Staff — {RANGE_LABELS[range]}</SectionTitle>
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', rowGap: 16 }}>
              {staffStats.map(({ id, label, color, days, apts, revenue, aptsPerDay }, i) => (
                <div key={id} style={{ flex: '1 0 45%', paddingLeft: i % 2 === 1 ? 16 : 0, borderLeft: i % 2 === 1 ? '1px solid var(--admin-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--admin-text)' }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <StatRow label="Revenue"      value={fmtMoney(revenue)} />
                    <StatRow label="Appointments" value={String(apts)} />
                    <StatRow label="Working days" value={String(days)} />
                    <StatRow label="Apts / day"   value={aptsPerDay} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Top services ──────────────────────────────────────────────── */}
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

          {/* ── Clients ───────────────────────────────────────────────────── */}
          <SectionTitle>Clients</SectionTitle>
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Unique clients</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 500, color: 'var(--admin-text)' }}>{totalUniqueClients}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>New</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--admin-call-text)' }}>{newClients}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Returning</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--admin-text)' }}>{returningClients}</div>
                  </div>
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--admin-border)', margin: '0 20px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Cancellation rate</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 500, color: cancelRate >= 20 ? 'var(--admin-error)' : cancelRate >= 10 ? '#b5824a' : 'var(--admin-text)' }}>
                  {cancelRate}%
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 8 }}>
                  {cancelled} of {totalApts} apts
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
