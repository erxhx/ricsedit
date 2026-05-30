'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor, SERVICE_COLORS } from '@/lib/appointment-colors';

// ── layout constants ──────────────────────────────────────────────────────────
const H0 = 8, H1 = 22;          // visible range: 8 am – 10 pm
const PPM = 2;                   // pixels per minute
const TW = 44;                   // time-label column width
const TOTAL_PX = (H1 - H0) * 60 * PPM;  // 1200 px

const HOURS = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
const STAFF = ['eric', 'livi'] as const;
// Staff-level dot colours for column headers (Livi uses her primary/wax colour)
const STAFF_DOT: Record<string, string> = {
  eric: SERVICE_COLORS.ericBarber,
  livi: SERVICE_COLORS.liviWax,
};

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

type DragRef = {
  aptId: string;
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

type DragConfirm = {
  apt: Appointment;
  newStartTime: string;
  newEndTime: string;
} | null;

type SlotAction = { staff: 'eric' | 'livi'; time: string } | null;
type BlockSheet = { staff: 'eric' | 'livi'; time: string } | null;

export default function DaySchedule({
  appointments: initial,
  date,
  stickyTop = 96,
}: {
  appointments: Appointment[];
  date: string;
  stickyTop?: number;
}) {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const aptEls = useRef<Map<string, HTMLElement>>(new Map());
  const nowRef = useRef<HTMLDivElement>(null);

  const [apts, setApts] = useState(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragConfirm, setDragConfirm] = useState<DragConfirm>(null);
  const [slotAction, setSlotAction] = useState<SlotAction>(null);
  const [blockSheet, setBlockSheet] = useState<BlockSheet>(null);
  const [blockDur, setBlockDur] = useState(60);
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return (d.getHours() - H0) * 60 + d.getMinutes();
  });

  // scroll to current time on mount
  useEffect(() => {
    if (nowRef.current) {
      nowRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, []);

  // tick current-time indicator
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin((d.getHours() - H0) * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // native touchmove with passive:false so we can preventDefault on drag
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    function onMove(e: TouchEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = e.touches[0].clientY - drag.startTouchY;

      // Long press not yet ready — watch for scroll intent
      if (!drag.longPressReady) {
        if (Math.abs(dy) > 12) {
          // User is scrolling; cancel the long-press timer
          if (drag.longPressTimer) {
            clearTimeout(drag.longPressTimer);
            drag.longPressTimer = null;
          }
          drag.scrollCancelled = true;
        }
        // Don't preventDefault before long press — let browser scroll
        return;
      }

      // Long press is ready: we're in drag mode
      e.preventDefault(); // block page scroll

      if (!drag.hasMoved && Math.abs(dy) > 8) {
        drag.hasMoved = true;
        const el = aptEls.current.get(drag.aptId);
        if (el) {
          el.style.opacity = '0.25';
          el.style.transform = 'none';
          el.style.boxShadow = 'none';
          el.style.transition = 'none';
        }
        setDraggingId(drag.aptId);
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
    if (el) {
      el.style.opacity = '1';
      el.style.transform = '';
      el.style.boxShadow = '';
      el.style.transition = '';
      el.style.zIndex = '';
    }
  }

  function onAptTouchStart(e: React.TouchEvent, apt: Appointment) {
    const origTopPx = t2m(apt.startTime) * PPM;
    const col = getAppointmentColor(apt.staff, apt.service);

    const timer = setTimeout(() => {
      const drag = dragRef.current;
      if (!drag || drag.aptId !== apt.id || drag.scrollCancelled) return;
      drag.longPressReady = true;
      // Visual feedback: lift the block so user knows drag is ready
      const el = aptEls.current.get(apt.id);
      if (el) {
        el.style.transform = 'scale(1.04)';
        el.style.boxShadow = `0 4px 16px rgba(20,18,16,0.2), 0 0 0 1.5px ${col}`;
        el.style.zIndex = '5';
        el.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease';
      }
    }, 450);

    dragRef.current = {
      aptId: apt.id,
      color: col,
      startTouchY: e.touches[0].clientY,
      origTopPx,
      durationPx: apt.durationMinutes * PPM,
      currentTopPx: origTopPx,
      hasMoved: false,
      longPressReady: false,
      longPressTimer: timer,
      scrollCancelled: false,
    };
  }

  function onAptTouchEnd(e: React.TouchEvent, apt: Appointment) {
    const drag = dragRef.current;
    dragRef.current = null;

    // Always clear timer and visuals
    if (drag?.longPressTimer) clearTimeout(drag.longPressTimer);
    clearDragVisuals(apt.id);
    setDraggingId(null);

    if (!drag) return;

    // Was a scroll gesture — do nothing
    if (drag.scrollCancelled) return;

    // Was a tap (finger lifted before long press, no meaningful movement)
    if (!drag.longPressReady && !drag.hasMoved) {
      router.push(`/admin/appointments/${apt.id}`);
      return;
    }

    // Long press fired but user didn't actually move — treat as detail tap
    if (drag.longPressReady && !drag.hasMoved) {
      router.push(`/admin/appointments/${apt.id}`);
      return;
    }

    // Drag completed — ask for confirmation before committing
    if (drag.longPressReady && drag.hasMoved) {
      const newStart = m2t(Math.round(drag.currentTopPx / PPM / 15) * 15);
      const newEnd = addMin(newStart, apt.durationMinutes);
      setDragConfirm({ apt, newStartTime: newStart, newEndTime: newEnd });
    }
  }

  function onAptTouchCancel(apt: Appointment) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.longPressTimer) clearTimeout(drag.longPressTimer);
    clearDragVisuals(apt.id);
    setDraggingId(null);
  }

  async function confirmReschedule() {
    if (!dragConfirm) return;
    const { apt, newStartTime, newEndTime } = dragConfirm;
    setApts((prev) =>
      prev.map((a) => a.id === apt.id ? { ...a, startTime: newStartTime, endTime: newEndTime } : a)
    );
    setDragConfirm(null);
    try {
      await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: newStartTime, endTime: newEndTime }),
      });
    } catch { /* mock — fail silently */ }
  }

  async function confirmBlock() {
    if (!blockSheet) return;
    const endTime = addMin(blockSheet.time, blockDur);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, startTime: blockSheet.time, endTime,
          staff: blockSheet.staff, clientName: '', clientEmail: '', clientPhone: '',
          service: 'Blocked', durationMinutes: blockDur, price: 0, status: 'blocked',
        }),
      });
      if (res.ok) {
        const apt = await res.json();
        setApts((prev) => [...prev, apt]);
      }
    } catch { /* mock */ }
    setBlockSheet(null);
  }

  const visible = apts.filter((a) => a.status !== 'cancelled');
  const ghostApt = draggingId ? apts.find((a) => a.id === draggingId) ?? null : null;

  return (
    <div style={{ position: 'relative' }}>

      {/* ── staff column headers ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', paddingLeft: TW,
        position: 'sticky', top: stickyTop, zIndex: 6,
        background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)',
      }}>
        {STAFF.map((s) => (
          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STAFF_DOT[s], flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)' }}>
              {s === 'eric' ? 'Eric' : 'Livi'}
            </span>
          </div>
        ))}
      </div>

      {/* ── timeline grid ────────────────────────────────────────────────── */}
      <div ref={gridRef} style={{ display: 'flex', position: 'relative', paddingBottom: 32 }}>

        {/* hour labels */}
        <div style={{ width: TW, flexShrink: 0, position: 'relative', height: TOTAL_PX }}>
          {HOURS.map((h) => (
            <div key={h} style={{
              position: 'absolute',
              top: (h - H0) * 60 * PPM - 6,
              right: 8,
              fontFamily: 'var(--font-body)', fontSize: 10,
              color: 'var(--admin-muted)', userSelect: 'none',
            }}>
              {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
            </div>
          ))}
        </div>

        {/* current-time bar — spans both columns */}
        {nowMin >= 0 && nowMin <= (H1 - H0) * 60 && (
          <div ref={nowRef} style={{
            position: 'absolute',
            top: nowMin * PPM, left: TW, right: 0,
            height: 0, borderTop: '1.5px solid #b03030',
            zIndex: 4, pointerEvents: 'none',
          }}>
            <div style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: '50%', background: '#b03030' }} />
          </div>
        )}

        {/* staff columns */}
        {STAFF.map((staff) => {
          const staffApts = visible.filter((a) => a.staff === staff);

          return (
            <div key={staff} style={{ flex: 1, position: 'relative', height: TOTAL_PX, borderLeft: '1px solid var(--admin-border-sub)' }}>

              {/* hour gridlines */}
              {HOURS.map((h) => (
                <div key={h} style={{
                  position: 'absolute', top: (h - H0) * 60 * PPM,
                  left: 0, right: 0,
                  borderTop: h === H0 ? 'none' : '1px solid var(--admin-border-sub)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* half-hour gridlines */}
              {HOURS.slice(0, -1).map((h) => (
                <div key={`${h}h`} style={{
                  position: 'absolute', top: (h - H0) * 60 * PPM + 30 * PPM,
                  left: 0, right: 0, borderTop: '1px solid var(--admin-border-faint)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* tap-to-book slots (30-min buckets) */}
              {Array.from({ length: (H1 - H0) * 2 }, (_, i) => {
                const s0 = i * 30, s1 = s0 + 30;
                const busy = staffApts.some((a) => t2m(a.startTime) < s1 && t2m(a.endTime) > s0);
                if (busy) return null;
                return (
                  <button
                    key={i}
                    onClick={() => setSlotAction({ staff, time: m2t(s0) })}
                    style={{
                      position: 'absolute', top: s0 * PPM, left: 0, right: 0,
                      height: 30 * PPM, background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  />
                );
              })}

              {/* appointment blocks */}
              {staffApts.map((apt) => {
                const topPx = t2m(apt.startTime) * PPM;
                const hPx = Math.max(apt.durationMinutes * PPM - 2, 22);
                const blocked = apt.status === 'blocked';
                const completed = apt.status === 'completed';
                const col = getAppointmentColor(apt.staff, apt.service);

                return (
                  <div
                    key={apt.id}
                    ref={(el) => { if (el) aptEls.current.set(apt.id, el); else aptEls.current.delete(apt.id); }}
                    onTouchStart={(e) => onAptTouchStart(e, apt)}
                    onTouchEnd={(e) => onAptTouchEnd(e, apt)}
                    onTouchCancel={() => onAptTouchCancel(apt)}
                    onClick={() => router.push(`/admin/appointments/${apt.id}`)}
                    style={{
                      position: 'absolute', top: topPx, left: 3, right: 3, height: hPx,
                      background: blocked ? 'var(--admin-blocked)' : completed ? `${col}18` : `${col}22`,
                      border: `1px solid ${blocked ? 'var(--admin-blocked-border)' : completed ? `${col}40` : `${col}60`}`,
                      borderLeft: `2.5px solid ${blocked ? 'var(--admin-blocked-border)' : completed ? `${col}70` : col}`,
                      borderRadius: 5, padding: '3px 6px',
                      cursor: 'pointer', touchAction: 'pan-y', zIndex: 2,
                      overflow: 'hidden',
                      opacity: completed ? 0.65 : 1,
                    }}
                  >
                    {blocked ? (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', fontStyle: 'italic' }}>Blocked</div>
                    ) : (
                      <>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: apt.notes ? 14 : 0 }}>
                          {apt.clientName}
                        </div>
                        {hPx > 38 && (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                            {apt.service}
                          </div>
                        )}
                        {apt.notes && (
                          <div style={{
                            position: 'absolute', top: 3, right: 5,
                            fontSize: 9, color: '#b5824a', lineHeight: 1,
                            fontFamily: 'var(--font-body)',
                          }}>
                            ≡
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* drag ghost */}
              {ghostApt?.staff === staff && (() => {
                const ghostCol = getAppointmentColor(ghostApt.staff, ghostApt.service);
                return (
                  <div
                    ref={ghostRef}
                    style={{
                      position: 'absolute',
                      top: t2m(ghostApt.startTime) * PPM,
                      left: 3, right: 3,
                      height: Math.max(ghostApt.durationMinutes * PPM - 2, 22),
                      background: `${ghostCol}28`,
                      border: `1.5px dashed ${ghostCol}`,
                      borderRadius: 5, pointerEvents: 'none', zIndex: 10,
                    }}
                  />
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ── drag confirm sheet ───────────────────────────────────────────── */}
      {dragConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
          onClick={() => setDragConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'var(--admin-sheet)', borderRadius: '16px 16px 0 0',
              padding: '24px 20px 44px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 6 }}>
              Reschedule
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)', marginBottom: 20 }}>
              Move {dragConfirm.apt.clientName} to{' '}
              <span style={{ color: 'var(--admin-text)' }}>
                {fmt(dragConfirm.newStartTime)} – {fmt(dragConfirm.newEndTime)}
              </span>
              ?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn
                label={`Move to ${fmt(dragConfirm.newStartTime)}`}
                variant="primary"
                onClick={confirmReschedule}
              />
              <SlotBtn
                label="Cancel"
                variant="ghost"
                onClick={() => setDragConfirm(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── slot action sheet ────────────────────────────────────────────── */}
      {slotAction && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setSlotAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'var(--admin-sheet)', borderRadius: '16px 16px 0 0',
              padding: '20px 20px 44px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', marginBottom: 16, textAlign: 'center' }}>
              {fmt(slotAction.time)} · {slotAction.staff === 'eric' ? 'Eric' : 'Livi'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn
                label="New booking"
                variant="primary"
                onClick={() => {
                  const { staff, time } = slotAction;
                  setSlotAction(null);
                  router.push(`/admin/new-booking?date=${date}&staff=${staff}&time=${time}`);
                }}
              />
              <SlotBtn
                label="Block time off"
                variant="ghost"
                onClick={() => {
                  setBlockSheet({ staff: slotAction.staff, time: slotAction.time });
                  setBlockDur(60);
                  setSlotAction(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── block-time sheet ─────────────────────────────────────────────── */}
      {blockSheet && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
          onClick={() => setBlockSheet(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'var(--admin-sheet)', borderRadius: '16px 16px 0 0',
              padding: '24px 20px 44px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 4 }}>
              Block time off
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)', marginBottom: 20 }}>
              {blockSheet.staff === 'eric' ? 'Eric' : 'Livi'} · {fmt(blockSheet.time)} – {fmt(addMin(blockSheet.time, blockDur))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[30, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => setBlockDur(d)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: blockDur === d ? `1.5px solid var(--admin-text)` : '1px solid var(--admin-border)',
                    background: blockDur === d ? 'var(--admin-text-tint)' : 'none',
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    color: blockDur === d ? 'var(--admin-text)' : 'var(--admin-text2)',
                    cursor: 'pointer',
                  }}
                >
                  {d < 60 ? `${d}m` : `${d / 60}h`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn label="Block" variant="muted" onClick={confirmBlock} />
              <SlotBtn label="Cancel" variant="ghost" onClick={() => setBlockSheet(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotBtn({ label, variant, onClick }: { label: string; variant: 'primary' | 'ghost' | 'muted'; onClick: () => void }) {
  const bg = variant === 'primary' ? 'var(--admin-btn-primary-bg)' : variant === 'muted' ? 'var(--admin-btn)' : 'none';
  const fg = variant === 'primary' ? 'var(--admin-btn-primary-fg)' : variant === 'muted' ? 'var(--admin-text)' : 'var(--admin-text2)';
  const border = variant === 'ghost' ? '1px solid var(--admin-border)' : 'none';
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px', borderRadius: 10, border,
        background: bg, color: fg,
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: variant === 'primary' ? 500 : 400,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
