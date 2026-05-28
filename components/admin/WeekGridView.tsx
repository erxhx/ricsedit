'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor, SERVICE_COLORS } from '@/lib/appointment-colors';

// ── layout constants ──────────────────────────────────────────────────────────
const H0 = 9, H1 = 19;
const PPM = 1.5;
const TW = 28;
const TOTAL_PX = (H1 - H0) * 60 * PPM;   // 900 px
const HOURS = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const OPEN: Record<number, boolean> = { 0: true, 1: false, 2: false, 3: true, 4: true, 5: true, 6: true };

// ── helpers ───────────────────────────────────────────────────────────────────
function t2m(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h - H0) * 60 + m;
}
function m2t(min: number): string {
  const snp = Math.round(Math.max(0, Math.min((H1 - H0) * 60 - 15, min)) / 15) * 15;
  const abs = snp + H0 * 60;
  return `${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
function addMin(t: string, d: number): string {
  const [h, m] = t.split(':').map(Number);
  const tot = h * 60 + m + d;
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
}
function fmt(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${hr}${p}` : `${hr}:${String(m).padStart(2, '0')}${p}`;
}
function fmtDateShort(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtHour(h: number): string {
  if (h === 12) return '12p';
  return h > 12 ? `${h - 12}p` : `${h}a`;
}

// ── overlap layout ────────────────────────────────────────────────────────────
function computePositions(apts: Appointment[]): Map<string, { leftPct: number; widthPct: number }> {
  const map = new Map<string, { leftPct: number; widthPct: number }>();
  for (const apt of apts) {
    const overlaps = apts.filter(
      (o) => o.id !== apt.id && o.startTime < apt.endTime && o.endTime > apt.startTime,
    );
    if (overlaps.length === 0) {
      map.set(apt.id, { leftPct: 0, widthPct: 100 });
    } else {
      const laneOrder = ['eric', 'livi'];
      const lane = Math.max(0, laneOrder.indexOf(apt.staff));
      map.set(apt.id, { leftPct: lane * 50, widthPct: 50 });
    }
  }
  return map;
}

// ── types ─────────────────────────────────────────────────────────────────────
type DragRef = {
  aptId: string;
  aptDate: string;
  color: string;
  startTouchY: number;
  origTopPx: number;
  durationPx: number;
  currentTopPx: number;
  hasMoved: boolean;
  longPressReady: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  scrollCancelled: boolean;
};

type DragConfirm = { apt: Appointment; newStartTime: string; newEndTime: string } | null;
type SlotAction  = { date: string; time: string } | null;

// ── component ─────────────────────────────────────────────────────────────────
export default function WeekGridView({
  appointments: initial,
  weekStart,
  stickyTop = 96,
}: {
  appointments: Appointment[];
  weekStart: Date;
  stickyTop?: number;
}) {
  const router = useRouter();
  const gridRef   = useRef<HTMLDivElement>(null);
  const dragRef   = useRef<DragRef | null>(null);
  const ghostRef  = useRef<HTMLDivElement | null>(null);
  const aptEls    = useRef<Map<string, HTMLElement>>(new Map());

  const [apts,         setApts]         = useState(initial);
  const [draggingId,   setDraggingId]   = useState<string | null>(null);
  const [draggingDate, setDraggingDate] = useState<string | null>(null);
  const [dragConfirm,  setDragConfirm]  = useState<DragConfirm>(null);
  const [slotAction,   setSlotAction]   = useState<SlotAction>(null);

  const today    = new Date();
  const todayStr = localStr(today);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const isThisWeek = localStr(weekStart) === localStr(thisWeekStart);

  const prevWeek = new Date(weekStart); prevWeek.setDate(weekStart.getDate() - 7);
  const nextWeek = new Date(weekStart); nextWeek.setDate(weekStart.getDate() + 7);

  const nowMin = (today.getHours() - H0) * 60 + today.getMinutes();
  const showNow = nowMin >= 0 && nowMin <= (H1 - H0) * 60;

  // Build day data
  const days = apts
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dateStr = localStr(d);
        const dayApts = apts.filter(
          (a) => a.date === dateStr && a.status !== 'cancelled' && a.status !== 'blocked',
        );
        return { dateStr, dateObj: d, dow: d.getDay(), isToday: dateStr === todayStr, isOpen: OPEN[d.getDay()] ?? false, apts: dayApts, positions: computePositions(dayApts) };
      })
    : [];

  // ── native touchmove (passive:false so we can preventDefault on drag) ────────
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    function onMove(e: TouchEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = e.touches[0].clientY - drag.startTouchY;
      if (!drag.longPressReady) {
        if (Math.abs(dy) > 12) {
          if (drag.longPressTimer) { clearTimeout(drag.longPressTimer); drag.longPressTimer = null; }
          drag.scrollCancelled = true;
        }
        return;
      }
      e.preventDefault();
      if (!drag.hasMoved && Math.abs(dy) > 8) {
        drag.hasMoved = true;
        const el = aptEls.current.get(drag.aptId);
        if (el) { el.style.opacity = '0.25'; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.transition = 'none'; }
        setDraggingId(drag.aptId);
        setDraggingDate(drag.aptDate);
      }
      if (drag.hasMoved) {
        const maxPx = TOTAL_PX - drag.durationPx;
        const raw = drag.origTopPx + dy;
        const snp = Math.round(Math.max(0, Math.min(maxPx, raw)) / (15 * PPM)) * (15 * PPM);
        drag.currentTopPx = snp;
        if (ghostRef.current) ghostRef.current.style.top = `${snp}px`;
      }
    }
    grid.addEventListener('touchmove', onMove, { passive: false });
    return () => grid.removeEventListener('touchmove', onMove);
  }, []);

  function clearDragVisuals(aptId: string) {
    const el = aptEls.current.get(aptId);
    if (el) { el.style.opacity = '1'; el.style.transform = ''; el.style.boxShadow = ''; el.style.transition = ''; el.style.zIndex = ''; }
  }

  function onAptTouchStart(e: React.TouchEvent, apt: Appointment) {
    const origTopPx = t2m(apt.startTime) * PPM;
    const col = getAppointmentColor(apt.staff, apt.service);
    const timer = setTimeout(() => {
      const drag = dragRef.current;
      if (!drag || drag.aptId !== apt.id || drag.scrollCancelled) return;
      drag.longPressReady = true;
      const el = aptEls.current.get(apt.id);
      if (el) { el.style.transform = 'scale(1.04)'; el.style.boxShadow = `0 4px 16px rgba(0,0,0,0.5), 0 0 0 1.5px ${col}`; el.style.zIndex = '5'; el.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease'; }
    }, 450);
    dragRef.current = { aptId: apt.id, aptDate: apt.date, color: col, startTouchY: e.touches[0].clientY, origTopPx, durationPx: apt.durationMinutes * PPM, currentTopPx: origTopPx, hasMoved: false, longPressReady: false, longPressTimer: timer, scrollCancelled: false };
  }

  function onAptTouchEnd(e: React.TouchEvent, apt: Appointment) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.longPressTimer) clearTimeout(drag.longPressTimer);
    clearDragVisuals(apt.id);
    setDraggingId(null);
    setDraggingDate(null);
    if (!drag) return;
    if (drag.scrollCancelled) return;
    if (!drag.longPressReady && !drag.hasMoved) { router.push(`/admin/appointments/${apt.id}`); return; }
    if (drag.longPressReady && !drag.hasMoved) { router.push(`/admin/appointments/${apt.id}`); return; }
    if (drag.longPressReady && drag.hasMoved) {
      const newStart = m2t(Math.round(drag.currentTopPx / PPM / 15) * 15);
      const newEnd   = addMin(newStart, apt.durationMinutes);
      setDragConfirm({ apt, newStartTime: newStart, newEndTime: newEnd });
    }
  }

  function onAptTouchCancel(apt: Appointment) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.longPressTimer) clearTimeout(drag.longPressTimer);
    clearDragVisuals(apt.id);
    setDraggingId(null);
    setDraggingDate(null);
  }

  async function confirmReschedule() {
    if (!dragConfirm) return;
    const { apt, newStartTime, newEndTime } = dragConfirm;
    setApts((prev) => prev.map((a) => a.id === apt.id ? { ...a, startTime: newStartTime, endTime: newEndTime } : a));
    setDragConfirm(null);
    try {
      await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: newStartTime, endTime: newEndTime }),
      });
    } catch { /* fail silently */ }
  }

  const navArrow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 7,
    border: '1px solid #252320', background: 'none',
    color: '#6b6760', fontSize: 16, lineHeight: 1,
    textDecoration: 'none', flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div>
      {/* ── week nav ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 10px 10px', borderBottom: '1px solid #1e1d1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isThisWeek && (
            <Link href="/admin?tab=calendar&mode=week" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, color: '#b5824a', textDecoration: 'none', padding: '4px 9px', borderRadius: 6, border: '1px solid #3a3530', WebkitTapHighlightColor: 'transparent' }}>
              Today
            </Link>
          )}
          <Link href={`/admin?tab=calendar&mode=week&week=${localStr(prevWeek)}`} style={navArrow}>‹</Link>
          <Link href={`/admin?tab=calendar&mode=week&week=${localStr(nextWeek)}`} style={navArrow}>›</Link>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['eric', 'livi'] as const).map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s === 'eric' ? SERVICE_COLORS.ericBarber : SERVICE_COLORS.liviWax }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#6b6760' }}>{s === 'eric' ? 'Eric' : 'Livi'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── day headers ── sticky ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', paddingLeft: TW, position: 'sticky', top: stickyTop, zIndex: 6, background: '#0d0c0a', borderBottom: '1px solid #1e1d1a' }}>
        {days.map((day) => (
          <div key={day.dateStr} style={{ flex: 1, textAlign: 'center', padding: '6px 2px', opacity: day.isOpen ? 1 : 0.3 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: '#4a4844', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>
              {DAY_ABBR[day.dow]}
            </div>
            {day.isToday ? (
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ece9e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: '#0d0c0a', lineHeight: 1 }}>{day.dateObj.getDate()}</span>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 400, color: '#7a7570', lineHeight: 1.2, marginTop: 2 }}>
                {day.dateObj.getDate()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── time grid ─────────────────────────────────────────────────────── */}
      <div ref={gridRef} style={{ display: 'flex', position: 'relative', paddingBottom: 24 }}>

        {/* Hour labels */}
        <div style={{ width: TW, flexShrink: 0, position: 'relative', height: TOTAL_PX }}>
          {HOURS.map((h) => (
            <div key={h} style={{ position: 'absolute', top: (h - H0) * 60 * PPM - 5, right: 4, fontFamily: 'var(--font-body)', fontSize: 9, color: '#3a3835', userSelect: 'none', lineHeight: 1 }}>
              {fmtHour(h)}
            </div>
          ))}
        </div>

        {/* Current-time bar */}
        {showNow && (
          <div style={{ position: 'absolute', top: nowMin * PPM, left: TW, right: 0, height: 0, borderTop: '1px solid #b03030', zIndex: 4, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: '50%', background: '#b03030' }} />
          </div>
        )}

        {/* Day columns */}
        {days.map((day) => {
          const isActiveGhost = draggingDate === day.dateStr;
          const ghostApt = isActiveGhost ? apts.find((a) => a.id === draggingId) ?? null : null;

          return (
            <div
              key={day.dateStr}
              style={{ flex: 1, position: 'relative', height: TOTAL_PX, borderLeft: '1px solid #1e1d1a', opacity: day.isOpen ? 1 : 0.6, background: day.isToday ? '#141412' : 'transparent' }}
            >
              {/* Hour gridlines */}
              {HOURS.map((h) => (
                <div key={h} style={{ position: 'absolute', top: (h - H0) * 60 * PPM, left: 0, right: 0, borderTop: h === H0 ? 'none' : '1px solid #1a1917', pointerEvents: 'none' }} />
              ))}

              {/* Half-hour gridlines */}
              {HOURS.slice(0, -1).map((h) => (
                <div key={`${h}h`} style={{ position: 'absolute', top: (h - H0) * 60 * PPM + 30 * PPM, left: 0, right: 0, borderTop: '1px solid #161513', pointerEvents: 'none' }} />
              ))}

              {/* Tap-to-book slots */}
              {Array.from({ length: (H1 - H0) * 2 }, (_, i) => {
                const s0 = i * 30, s1 = s0 + 30;
                const busy = day.apts.some((a) => t2m(a.startTime) < s1 && t2m(a.endTime) > s0);
                if (busy) return null;
                return (
                  <button
                    key={i}
                    onClick={() => setSlotAction({ date: day.dateStr, time: m2t(s0) })}
                    style={{ position: 'absolute', top: s0 * PPM, left: 0, right: 0, height: 30 * PPM, background: 'none', border: 'none', cursor: 'pointer' }}
                  />
                );
              })}

              {/* Appointment blocks */}
              {day.apts.map((apt) => {
                const topPx = t2m(apt.startTime) * PPM;
                const hPx   = Math.max(apt.durationMinutes * PPM - 1, 14);
                const col   = getAppointmentColor(apt.staff, apt.service);
                const pos   = day.positions.get(apt.id) ?? { leftPct: 0, widthPct: 100 };

                return (
                  <div
                    key={apt.id}
                    ref={(el) => { if (el) aptEls.current.set(apt.id, el); else aptEls.current.delete(apt.id); }}
                    onTouchStart={(e) => onAptTouchStart(e, apt)}
                    onTouchEnd={(e) => onAptTouchEnd(e, apt)}
                    onTouchCancel={() => onAptTouchCancel(apt)}
                    onClick={() => router.push(`/admin/appointments/${apt.id}`)}
                    style={{
                      position: 'absolute',
                      top: topPx,
                      left: `calc(${pos.leftPct}% + 1px)`,
                      width: `calc(${pos.widthPct}% - 2px)`,
                      height: hPx,
                      background: `${col}20`,
                      border: `1px solid ${col}50`,
                      borderLeft: `2px solid ${col}`,
                      borderRadius: 3,
                      padding: '2px 3px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      zIndex: 2,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: '#dedad4', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: apt.notes ? 8 : 0 }}>
                      {apt.clientName.split(' ')[0]}
                    </div>
                    {hPx > 26 && (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: '#6b6760', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {apt.service}
                      </div>
                    )}
                    {apt.notes && (
                      <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 8, color: '#b5824a', lineHeight: 1 }}>≡</div>
                    )}
                  </div>
                );
              })}

              {/* Drag ghost */}
              {ghostApt && (() => {
                const ghostCol = getAppointmentColor(ghostApt.staff, ghostApt.service);
                const pos = day.positions.get(ghostApt.id) ?? { leftPct: 0, widthPct: 100 };
                return (
                  <div
                    ref={ghostRef}
                    style={{
                      position: 'absolute',
                      top: t2m(ghostApt.startTime) * PPM,
                      left: `calc(${pos.leftPct}% + 1px)`,
                      width: `calc(${pos.widthPct}% - 2px)`,
                      height: Math.max(ghostApt.durationMinutes * PPM - 1, 14),
                      background: `${ghostCol}28`,
                      border: `1.5px dashed ${ghostCol}`,
                      borderRadius: 3,
                      pointerEvents: 'none',
                      zIndex: 10,
                      boxSizing: 'border-box',
                    }}
                  />
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ── drag confirm sheet ────────────────────────────────────────────── */}
      {dragConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60 }} onClick={() => setDragConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1c1b18', borderRadius: '16px 16px 0 0', padding: '24px 20px 44px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: '#ece9e2', marginBottom: 4 }}>Reschedule</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#6b6760', marginBottom: 20 }}>
              Move {dragConfirm.apt.clientName} to{' '}
              <span style={{ color: '#ece9e2' }}>{fmtDateShort(dragConfirm.apt.date)} · {fmt(dragConfirm.newStartTime)} – {fmt(dragConfirm.newEndTime)}</span>?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn label={`Move to ${fmt(dragConfirm.newStartTime)}`} variant="primary" onClick={confirmReschedule} />
              <SlotBtn label="Cancel" variant="ghost" onClick={() => setDragConfirm(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── slot action sheet ─────────────────────────────────────────────── */}
      {slotAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setSlotAction(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1c1b18', borderRadius: '16px 16px 0 0', padding: '20px 20px 44px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#4a4844', marginBottom: 16, textAlign: 'center' }}>
              {fmtDateShort(slotAction.date)} · {fmt(slotAction.time)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn label="Book Eric" variant="primary" onClick={() => { const { date, time } = slotAction; setSlotAction(null); router.push(`/admin/new-booking?date=${date}&staff=eric&time=${time}`); }} />
              <SlotBtn label="Book Livi" variant="primary" onClick={() => { const { date, time } = slotAction; setSlotAction(null); router.push(`/admin/new-booking?date=${date}&staff=livi&time=${time}`); }} />
              <SlotBtn label="Cancel" variant="ghost" onClick={() => setSlotAction(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotBtn({ label, variant, onClick }: { label: string; variant: 'primary' | 'ghost'; onClick: () => void }) {
  const bg     = variant === 'primary' ? '#ece9e2' : 'none';
  const fg     = variant === 'primary' ? '#0d0c0a' : '#6b6760';
  const border = variant === 'ghost'   ? '1px solid #252320' : 'none';
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '14px', borderRadius: 10, border, background: bg, color: fg, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: variant === 'primary' ? 500 : 400, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
