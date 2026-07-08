'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor } from '@/lib/appointment-colors';
import { STAFF as ROSTER, STAFF_IDS, staffName, staffColor } from '@/lib/staff';
import useScrollLock from './useScrollLock';

// ── layout constants ──────────────────────────────────────────────────────────
const H0 = 8, H1 = 22;          // visible range: 8 am – 10 pm
const PPM = 2;                   // pixels per minute
const TW = 44;                   // time-label column width
const COL_W = 150;               // min width per staff column before horizontal scroll
const HEADER_H = 37;             // staff column-header height
const TOTAL_PX = (H1 - H0) * 60 * PPM;  // 1200 px

const HOURS = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);

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

type SlotAction    = { staff: string; time: string } | null;
type BlockSheet    = { staff: string; time: string } | null;
type BlockDelSheet = Appointment | null;

const QUICK_LABELS = ['Lunch', 'Break', 'Personal', 'Studio closed'] as const;

function timeDiff(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// Generate 15-min end-time options after a given start
function endTimeOptions(startTime: string): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const opts: string[] = [];
  for (let m = startMin + 15; m <= H1 * 60; m += 15) {
    opts.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return opts;
}

function fmtDateNav(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function DaySchedule({
  appointments: initial,
  date,
  stickyTop = 52,
  isToday,
  onPrev,
  onNext,
  onGoToday,
  modeToggle,
  hoursByDay,
  staffHoursByDay,
  barberThuClose,
}: {
  appointments: Appointment[];
  date: string;
  stickyTop?: number;
  isToday?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onGoToday?: () => void;
  modeToggle?: React.ReactNode;
  hoursByDay?: Record<number, [number, number] | null>;
  staffHoursByDay?: Record<string, Record<number, [number, number] | null>>;
  barberThuClose?: number;
}) {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const aptEls = useRef<Map<string, HTMLElement>>(new Map());
  const nowRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const [apts, setApts] = useState(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragConfirm, setDragConfirm] = useState<DragConfirm>(null);
  const [notifyReschedule, setNotifyReschedule] = useState(true);
  const [slotAction,    setSlotAction]    = useState<SlotAction>(null);
  const [blockSheet,    setBlockSheet]    = useState<BlockSheet>(null);
  const [blockDelSheet, setBlockDelSheet] = useState<BlockDelSheet>(null);
  const [blockDur,      setBlockDur]      = useState(60);
  const [blockLabel,    setBlockLabel]    = useState('');
  const [blockBoth,     setBlockBoth]     = useState(false);
  const [useCustomEnd,  setUseCustomEnd]  = useState(false);
  const [customEndTime, setCustomEndTime] = useState('');
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return (d.getHours() - H0) * 60 + d.getMinutes();
  });

  // Column width in explicit pixels, measured from the track. iOS Safari
  // mis-resolves %/left+right widths of absolutely-positioned children inside
  // flex-basis-sized columns under an accelerated horizontal scroller (blocks
  // collapsed to slivers on-device while every desktop engine was fine), so
  // nothing in this grid may rely on relative widths: columns and their
  // absolute children all get pixel values derived from this state.
  const [colW, setColW] = useState<number>(COL_W);
  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;
    const measure = () => {
      // Columns fill the track when it's wide enough, else fixed COL_W + h-scroll
      setColW(Math.max(COL_W, Math.floor(el.clientWidth / ROSTER.length)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Freeze the page while any bottom sheet is open
  useScrollLock(!!(dragConfirm || slotAction || blockSheet || blockDelSheet));

  // sync appointments when the parent navigates to a different day
  useEffect(() => {
    setApts(initial);
  }, [initial]);

  // Closed-hours grey bands — per-staff personal schedule takes priority over store hours
  const dayOfWeek = (() => { const [y, mo, d] = date.split('-').map(Number); return new Date(y, mo - 1, d).getDay(); })();
  const baseDayHours = hoursByDay?.[dayOfWeek] ?? null; // store hours fallback

  /** Returns pixel bands {preH, postTop, postH} for a given staff column */
  function closedBands(staff: string): { preH: number; postTop: number; postH: number } {
    if (hoursByDay === undefined && staffHoursByDay === undefined) return { preH: 0, postTop: TOTAL_PX, postH: 0 };
    // Prefer per-staff schedule; fall back to store hours
    let h: [number, number] | null = staffHoursByDay?.[staff]?.[dayOfWeek] ?? baseDayHours;
    // Eric on Thursday: extend close to barberThuClose if set
    if (staff === 'eric' && dayOfWeek === 4 && barberThuClose != null && h !== null) {
      h = [h[0], barberThuClose];
    }
    // Barber gets +15 min flex at end of day (same rule as the booking slot engine)
    const barberFlex = staff === 'eric' ? 15 : 0;
    const preH    = h ? Math.max(0, (h[0] - H0) * 60 * PPM) : TOTAL_PX;
    const postTop = h ? Math.max(0, (h[1] - H0) * 60 * PPM + barberFlex * PPM) : 0;
    const postH   = h ? Math.max(0, TOTAL_PX - postTop) : 0;
    return { preH, postTop, postH };
  }

  // Headroom: hide nav bar on scroll-down, reveal on scroll-up
  const NAV_H = 49; // nav bar height (px) — padding 8+8 + button 32 + border 1
  const [navShown, setNavShown] = useState(true);
  const lastScrollRef = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastScrollRef.current;
      lastScrollRef.current = y;
      if (y <= NAV_H)       setNavShown(true);
      else if (goingDown)   setNavShown(false);
      else                  setNavShown(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // scroll to current time on mount
  useEffect(() => {
    if (nowRef.current) {
      // inline:'nearest' pins the horizontal axis — the now-line lives inside the
      // horizontally scrollable track and must not yank it sideways on mount.
      nowRef.current.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
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
      if (apt.status === 'blocked') { setBlockDelSheet(apt); } else { router.push(`/admin/appointments/${apt.id}`); }
      return;
    }

    // Long press fired but user didn't actually move — treat as detail tap
    if (drag.longPressReady && !drag.hasMoved) {
      if (apt.status === 'blocked') { setBlockDelSheet(apt); } else { router.push(`/admin/appointments/${apt.id}`); }
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

  function onAptMouseDown(e: React.MouseEvent, apt: Appointment) {
    if (e.button !== 0) return;   // left button only
    e.preventDefault();            // prevent text selection while dragging

    const origTopPx = t2m(apt.startTime) * PPM;
    const col = getAppointmentColor(apt.staff, apt.service);
    dragRef.current = {
      aptId: apt.id, color: col,
      startTouchY: e.clientY, origTopPx,
      durationPx: apt.durationMinutes * PPM,
      currentTopPx: origTopPx,
      hasMoved: false, longPressReady: true, // no long-press delay for mouse
      longPressTimer: null, scrollCancelled: false,
    };

    function onMouseMove(ev: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = ev.clientY - drag.startTouchY;
      if (!drag.hasMoved && Math.abs(dy) > 4) {
        drag.hasMoved = true;
        const el = aptEls.current.get(drag.aptId);
        if (el) { el.style.opacity = '0.25'; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.transition = 'none'; }
        setDraggingId(drag.aptId);
      }
      if (drag.hasMoved) {
        const maxPx = TOTAL_PX - drag.durationPx;
        const snp = Math.round(Math.max(0, Math.min(maxPx, drag.origTopPx + dy)) / (15 * PPM)) * (15 * PPM);
        drag.currentTopPx = snp;
        if (ghostRef.current) ghostRef.current.style.top = `${snp}px`;
      }
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const drag = dragRef.current;
      dragRef.current = null;
      clearDragVisuals(apt.id);
      setDraggingId(null);
      if (!drag) return;
      if (!drag.hasMoved) {
        if (apt.status === 'blocked') { setBlockDelSheet(apt); } else { router.push(`/admin/appointments/${apt.id}`); }
        return;
      }
      const newStart = m2t(Math.round(drag.currentTopPx / PPM / 15) * 15);
      setDragConfirm({ apt, newStartTime: newStart, newEndTime: addMin(newStart, apt.durationMinutes) });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  async function confirmReschedule() {
    if (!dragConfirm) return;
    const { apt, newStartTime, newEndTime } = dragConfirm;
    const notify = notifyReschedule;
    setApts((prev) =>
      prev.map((a) => a.id === apt.id ? { ...a, startTime: newStartTime, endTime: newEndTime } : a)
    );
    setDragConfirm(null);
    setNotifyReschedule(true); // reset for next drag
    try {
      await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: newStartTime, endTime: newEndTime, notify }),
      });
    } catch { /* fail silently */ }
  }

  async function confirmBlock() {
    if (!blockSheet) return;
    const label    = blockLabel.trim() || 'Blocked';
    const endTime  = useCustomEnd ? customEndTime : addMin(blockSheet.time, blockDur);
    const dur      = useCustomEnd ? timeDiff(blockSheet.time, customEndTime) : blockDur;
    if (dur <= 0) return;
    const staffList = blockBoth ? STAFF_IDS : [blockSheet.staff];
    const results = await Promise.all(
      staffList.map((staff) =>
        fetch('/api/admin/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date, startTime: blockSheet.time, endTime,
            staff, clientName: '', clientEmail: '', clientPhone: '',
            service: label, durationMinutes: dur, price: 0, status: 'blocked',
          }),
        }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      )
    );
    setApts((prev) => [...prev, ...results.filter(Boolean)]);
    setBlockSheet(null);
    setBlockLabel('');
    setBlockBoth(false);
    setUseCustomEnd(false);
  }

  async function deleteBlock(apt: Appointment) {
    setApts((prev) => prev.filter((a) => a.id !== apt.id));
    setBlockDelSheet(null);
    try {
      await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    } catch { /* silent */ }
  }

  const visible = apts.filter((a) => a.status !== 'cancelled');
  const ghostApt = draggingId ? apts.find((a) => a.id === draggingId) ?? null : null;

  // Keep the staff-header row and the timeline body in horizontal lockstep.
  function syncScroll(src: 'header' | 'body') {
    const from = src === 'header' ? headerScrollRef.current : bodyScrollRef.current;
    const to   = src === 'header' ? bodyScrollRef.current   : headerScrollRef.current;
    if (from && to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
  }

  const navArrow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 32,
    color: 'var(--admin-text2)', fontSize: 16, lineHeight: 1,
    flexShrink: 0, cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={{ position: 'relative' }}>

      {/* ── day nav bar ───────────────────────────────────────────────────── */}
      {(onPrev || onNext || modeToggle) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: '1px solid var(--admin-border-sub)',
          position: 'sticky', top: `calc(${stickyTop}px + var(--admin-safe-top))`, zIndex: 7,
          background: 'var(--admin-bg)',
          transform: navShown ? 'translateY(0)' : `translateY(calc(-100% - ${stickyTop}px - var(--admin-safe-top)))`,
          transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>

          {/* Date flanked by arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {onPrev && <button onClick={onPrev} className="lg lg-capsule lg-press" style={navArrow}>‹</button>}
            <button
              style={{
                fontFamily: 'var(--font-body)', fontSize: 13,
                fontWeight: 500, color: 'var(--admin-text)',
                background: 'none', border: 'none',
                cursor: 'default',
                padding: '0 6px',
                display: 'flex', alignItems: 'center', gap: 6,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {fmtDateNav(date)}
              {isToday && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4a9b6f', display: 'inline-block', flexShrink: 0 }} />
              )}
            </button>
            {onNext && <button onClick={onNext} className="lg lg-capsule lg-press" style={navArrow}>›</button>}
            {!isToday && onGoToday && (
              <button
                onClick={onGoToday}
                className="lg lg-capsule lg-press"
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, color: '#b5824a',
                  letterSpacing: '0.04em', fontWeight: 500,
                  cursor: 'pointer', padding: '7px 12px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Today
              </button>
            )}
          </div>

          {/* Mode toggle as connected glass pill */}
          {modeToggle}
        </div>
      )}

      {/* ── staff column headers ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        position: 'sticky', top: `calc(${stickyTop + (navShown ? NAV_H : 0)}px + var(--admin-safe-top))`, zIndex: 6,
        transition: 'top 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)',
      }}>
        {/* fixed gutter spacer (aligns with hour-label column) */}
        <div style={{ width: TW, flexShrink: 0 }} />
        {/* scrollable header track — kept in sync with the body below */}
        <div
          ref={headerScrollRef}
          onScroll={() => syncScroll('header')}
          style={{ flex: 1, overflowX: 'auto', overscrollBehaviorX: 'contain', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          <div style={{ display: 'flex' }}>
            {ROSTER.map((m) => (
              <div key={m.id} style={{ width: colW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderLeft: '1px solid var(--admin-border-sub)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: staffColor(m.id), flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)' }}>
                  {m.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── timeline grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', position: 'relative', paddingBottom: 32 }}>

        {/* hour labels (fixed gutter) */}
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

        {/* scrollable body track */}
        <div
          ref={bodyScrollRef}
          onScroll={() => syncScroll('body')}
          style={{
            flex: 1, overflowX: 'auto', position: 'relative',
            // Contain edge overscroll so a fling doesn't chain into page
            // rubber-banding. No scroll-snap here: snapping fights diagonal
            // pans on a 2-axis grid (feels like it bounces back).
            overscrollBehaviorX: 'contain',
          }}
        >
          <div ref={gridRef} style={{ display: 'flex', position: 'relative', height: TOTAL_PX }}>

            {/* current-time bar — spans all columns */}
            {nowMin >= 0 && nowMin <= (H1 - H0) * 60 && (
              <div ref={nowRef} style={{
                position: 'absolute',
                top: nowMin * PPM, left: 0, right: 0,
                height: 0, borderTop: '1.5px solid #b03030',
                zIndex: 4, pointerEvents: 'none',
              }}>
                <div style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: '50%', background: '#b03030' }} />
              </div>
            )}

            {/* staff columns */}
            {ROSTER.map((m) => {
          const staff = m.id;
          const staffApts = visible.filter((a) => a.staff === staff);

          return (
            <div key={staff} style={{ width: colW, flexShrink: 0, position: 'relative', height: TOTAL_PX, borderLeft: '1px solid var(--admin-border-sub)' }}>

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

              {/* closed-hours overlay — grey bands outside this staff member's hours */}
              {(() => {
                const { preH, postTop, postH } = closedBands(staff);
                return (<>
                  {preH > 0 && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: preH,
                      background: 'var(--admin-closed-band, rgba(0,0,0,0.045))',
                      pointerEvents: 'none', zIndex: 1,
                    }} />
                  )}
                  {postH > 0 && (
                    <div style={{
                      position: 'absolute', top: postTop, left: 0, right: 0, height: postH,
                      background: 'var(--admin-closed-band, rgba(0,0,0,0.045))',
                      pointerEvents: 'none', zIndex: 1,
                    }} />
                  )}
                </>);
              })()}

              {/* selected-slot highlight */}
              {slotAction?.staff === staff && (() => {
                const topPx = t2m(slotAction.time) * PPM;
                const color = staffColor(staff);
                return (
                  <div style={{
                    position: 'absolute',
                    top: topPx, left: 2, width: colW - 4,
                    height: 15 * PPM,
                    background: `${color}20`,
                    border: `1.5px solid ${color}`,
                    borderRadius: 4,
                    pointerEvents: 'none',
                    zIndex: 2,
                  }} />
                );
              })()}

              {/* tap-to-book slots (15-min buckets for precise back-to-back booking) */}
              {Array.from({ length: (H1 - H0) * 4 }, (_, i) => {
                const s0 = i * 15, s1 = s0 + 15;
                const busy = staffApts.some((a) => t2m(a.startTime) < s1 && t2m(a.endTime) > s0);
                if (busy) return null;
                return (
                  <button
                    key={i}
                    onClick={() => setSlotAction({ staff, time: m2t(s0) })}
                    style={{
                      position: 'absolute', top: s0 * PPM, left: 0, right: 0,
                      height: 15 * PPM, background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  />
                );
              })}

              {/* appointment blocks */}
              {staffApts.map((apt) => {
                const topPx = t2m(apt.startTime) * PPM;
                const hPx = Math.max(apt.durationMinutes * PPM, 22);
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
                    onMouseDown={(e) => onAptMouseDown(e, apt)}
                    style={{
                      // Pixel width from measured colW — see the colW comment above.
                      position: 'absolute', top: topPx, left: 3, width: colW - 6, height: hPx,
                      background: blocked ? 'var(--admin-blocked)' : completed ? `${col}18` : `${col}22`,
                      border: `1px solid ${blocked ? 'var(--admin-blocked-border)' : completed ? `${col}40` : `${col}60`}`,
                      borderLeft: `2.5px solid ${blocked ? 'var(--admin-blocked-border)' : completed ? `${col}70` : col}`,
                      borderRadius: 5, padding: '3px 6px',
                      cursor: 'grab', touchAction: 'pan-y', zIndex: 2,
                      overflow: 'hidden', userSelect: 'none',
                      opacity: completed ? 0.65 : 1,
                    }}
                  >
                    {blocked ? (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', fontStyle: 'italic' }}>
                        {apt.service && apt.service !== 'Blocked' ? apt.service : 'Blocked'}
                      </div>
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
                        {apt.reminderSent && (
                          <div style={{
                            position: 'absolute', bottom: 3, right: 5,
                            fontSize: 8, color: '#4a9b6f', lineHeight: 1,
                            fontFamily: 'var(--font-body)', fontWeight: 600,
                          }}>
                            ✓
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
                      left: 3, width: colW - 6,
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
          </div>{/* gridRef inner flex */}
        </div>{/* body scroll track */}
      </div>

      {/* ── drag confirm sheet ───────────────────────────────────────────── */}
      {dragConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
          onClick={() => setDragConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="lg-sheet lg-bottom-sheet"
            style={{ padding: '24px 20px 34px' }}
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
            {/* Notify client toggle */}
            <button
              onClick={() => setNotifyReschedule(n => !n)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', marginBottom: 16 }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>Notify client</span>
              <span style={{ width: 44, height: 26, borderRadius: 13, background: notifyReschedule ? '#34C759' : 'var(--admin-border)', display: 'flex', alignItems: 'center', padding: '0 3px', transition: 'background 0.2s', justifyContent: notifyReschedule ? 'flex-end' : 'flex-start', flexShrink: 0 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </span>
            </button>
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
            className="lg-sheet lg-bottom-sheet"
            style={{ padding: '20px 20px 34px' }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', marginBottom: 16, textAlign: 'center' }}>
              {fmt(slotAction.time)} · {staffName(slotAction.staff)}
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
                  setBlockLabel('');
                  setBlockBoth(false);
                  setUseCustomEnd(false);
                  setCustomEndTime(addMin(slotAction.time, 60));
                  setSlotAction(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── block-time sheet ─────────────────────────────────────────────── */}
      {blockSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} onClick={() => setBlockSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} className="lg-sheet lg-bottom-sheet" style={{ padding: '24px 20px 34px', overflowY: 'auto', maxHeight: '90vh' }}>

            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 2 }}>Block time off</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', marginBottom: 20 }}>
              {blockBoth ? 'All staff' : staffName(blockSheet.staff)} · {fmt(blockSheet.time)} – {fmt(useCustomEnd && customEndTime ? customEndTime : addMin(blockSheet.time, blockDur))}
            </div>

            {/* Label chips */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Label</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {QUICK_LABELS.map((lbl) => {
                const active = blockLabel === lbl;
                return (
                  <button key={lbl} onClick={() => setBlockLabel(active ? '' : lbl)} style={{ padding: '7px 12px', borderRadius: 20, border: active ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: active ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: active ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    {lbl}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={blockLabel}
              onChange={(e) => setBlockLabel(e.target.value)}
              placeholder="Custom label…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-btn)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', outline: 'none', marginBottom: 20 }}
            />

            {/* Duration */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Duration</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: useCustomEnd ? 10 : 20 }}>
              {[30, 60, 90, 120, 180].map((d) => {
                const active = !useCustomEnd && blockDur === d;
                return (
                  <button key={d} onClick={() => { setUseCustomEnd(false); setBlockDur(d); }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: active ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: active ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 12, color: active ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    {d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h${d % 60}`}
                  </button>
                );
              })}
              <button onClick={() => setUseCustomEnd(true)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: useCustomEnd ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: useCustomEnd ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 12, color: useCustomEnd ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                Custom
              </button>
            </div>
            {useCustomEnd && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginBottom: 6 }}>End time</div>
                <select
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-btn)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', outline: 'none' }}
                >
                  {endTimeOptions(blockSheet.time).map((t) => (
                    <option key={t} value={t}>{fmt(t)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Block both toggle */}
            <button
              onClick={() => setBlockBoth((b) => !b)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '13px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', marginBottom: 20 }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>Block all staff</span>
              <span style={{ width: 44, height: 26, borderRadius: 13, background: blockBoth ? '#34C759' : 'var(--admin-border)', display: 'flex', alignItems: 'center', padding: '0 3px', transition: 'background 0.2s', justifyContent: blockBoth ? 'flex-end' : 'flex-start', flexShrink: 0 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn label="Block" variant="muted" onClick={confirmBlock} />
              <SlotBtn label="Cancel" variant="ghost" onClick={() => setBlockSheet(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── block delete sheet ───────────────────────────────────────────── */}
      {blockDelSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} onClick={() => setBlockDelSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} className="lg-sheet lg-bottom-sheet" style={{ padding: '24px 20px 34px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 2 }}>
              {blockDelSheet.service && blockDelSheet.service !== 'Blocked' ? blockDelSheet.service : 'Blocked'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', marginBottom: 24 }}>
              {staffName(blockDelSheet.staff)} · {fmt(blockDelSheet.startTime)} – {fmt(blockDelSheet.endTime)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn label="Remove block" variant="danger" onClick={() => deleteBlock(blockDelSheet)} />
              <SlotBtn label="Keep it" variant="ghost" onClick={() => setBlockDelSheet(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotBtn({ label, variant, onClick }: { label: string; variant: 'primary' | 'ghost' | 'muted' | 'danger'; onClick: () => void }) {
  const bg = variant === 'primary' ? 'var(--admin-btn-primary-bg)' : variant === 'muted' ? 'var(--admin-btn)' : variant === 'danger' ? '#FF3B30' : 'none';
  const fg = variant === 'primary' ? 'var(--admin-btn-primary-fg)' : variant === 'muted' ? 'var(--admin-text)' : variant === 'danger' ? '#fff' : 'var(--admin-text2)';
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
