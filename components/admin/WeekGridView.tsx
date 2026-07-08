'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor } from '@/lib/appointment-colors';
import { STAFF as ROSTER, STAFF_IDS, staffName } from '@/lib/staff';
import useScrollLock from './useScrollLock';

// ── layout constants ──────────────────────────────────────────────────────────
const H0 = 8, H1 = 22;
const PPM = 1.5;
const TW = 40;
const TOTAL_PX = (H1 - H0) * 60 * PPM;
const HOURS = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
function fmtWeekRange(start: Date): string {
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const sm = start.toLocaleDateString('en-US', { month: 'short' });
  const em = end.toLocaleDateString('en-US', { month: 'short' });
  return sm === em
    ? `${sm} ${start.getDate()} – ${end.getDate()}`
    : `${sm} ${start.getDate()} – ${em} ${end.getDate()}`;
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
      // Lay overlapping appointments out in per-staff lanes.
      const laneCount = Math.max(1, STAFF_IDS.length);
      const lane = Math.max(0, STAFF_IDS.indexOf(apt.staff));
      const w = 100 / laneCount;
      map.set(apt.id, { leftPct: lane * w, widthPct: w });
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
  startClientX: number;  // for cross-day detection
  origDayIdx: number;    // which column the drag started in
  targetDayIdx: number;  // which column we're currently over
  origTopPx: number;
  durationPx: number;
  currentTopPx: number;
  hasMoved: boolean;
  longPressReady: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  scrollCancelled: boolean;
};

type DragConfirm  = { apt: Appointment; newStartTime: string; newEndTime: string; newDate: string } | null;
type SlotAction   = { date: string; time: string } | null;
// staff is a roster id, or 'all' to block every staff member at once
type WGBlockSheet = { date: string; time: string; staff: string } | null;

const QUICK_LABELS_WG = ['Lunch', 'Break', 'Personal', 'Studio closed'] as const;

function timeDiffWG(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
function endTimeOptionsWG(startTime: string): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const opts: string[] = [];
  for (let m = startMin + 15; m <= H1 * 60; m += 15) {
    opts.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return opts;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function WeekGridView({
  appointments: initial,
  weekStart,
  isLoading,
  onPrevWeek,
  onNextWeek,
  onGoCurrentWeek,
  openDays,
  hoursByDay,
  stickyTop = 52,
  modeToggle,
}: {
  appointments: Appointment[];
  weekStart: Date;
  isLoading?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoCurrentWeek?: () => void;
  openDays?: Record<number, boolean>;
  hoursByDay?: Record<number, [number, number] | null>;
  stickyTop?: number;
  modeToggle?: React.ReactNode;
}) {
  const router = useRouter();
  const gridRef   = useRef<HTMLDivElement>(null);
  const dragRef   = useRef<DragRef | null>(null);
  const ghostRef  = useRef<HTMLDivElement | null>(null);
  const aptEls    = useRef<Map<string, HTMLElement>>(new Map());
  const nowRef    = useRef<HTMLDivElement>(null);
  const swipeRef  = useRef<{ startX: number; startY: number } | null>(null);

  const [notifyReschedule, setNotifyReschedule] = useState(true);
  const [apts,          setApts]          = useState(initial);
  const [draggingId,    setDraggingId]    = useState<string | null>(null);
  const [draggingDate,  setDraggingDate]  = useState<string | null>(null);
  const [dragConfirm,   setDragConfirm]   = useState<DragConfirm>(null);
  const [slotAction,    setSlotAction]    = useState<SlotAction>(null);
  const [blockSheet,    setBlockSheet]    = useState<WGBlockSheet>(null);
  const [blockDelSheet, setBlockDelSheet] = useState<Appointment | null>(null);
  const [blockLabel,    setBlockLabel]    = useState('');
  const [blockDur,      setBlockDur]      = useState(60);
  const [useCustomEnd,  setUseCustomEnd]  = useState(false);
  const [customEndTime, setCustomEndTime] = useState('');

  // Freeze the page while any bottom sheet is open
  useScrollLock(!!(dragConfirm || slotAction || blockSheet || blockDelSheet));

  const today    = new Date();
  const todayStr = localStr(today);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const isThisWeek = localStr(weekStart) === localStr(thisWeekStart);

  // Headroom: hide nav bar on scroll-down, reveal on scroll-up
  const NAV_H = 49;
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


  const nowMin = (today.getHours() - H0) * 60 + today.getMinutes();
  const showNow = nowMin >= 0 && nowMin <= (H1 - H0) * 60;

  // Build day data
  const days = apts
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dateStr = localStr(d);
        const dayApts = apts.filter(
          (a) => a.date === dateStr && a.status !== 'cancelled',
        );
        return { dateStr, dateObj: d, dow: d.getDay(), isToday: dateStr === todayStr, isOpen: openDays ? (openDays[d.getDay()] ?? true) : true, apts: dayApts, positions: computePositions(dayApts) };
      })
    : [];

  // ── sync appointments when the parent fetches a new week ─────────────────────
  useEffect(() => {
    setApts(initial);
  }, [initial]);

  // ── scroll to current time on mount ──────────────────────────────────────────
  useEffect(() => {
    if (nowRef.current) {
      nowRef.current.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    }
  }, []);

  // ── native touchmove (passive:false so we can preventDefault on drag) ────────
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    function onMove(e: TouchEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = e.touches[0].clientY - drag.startTouchY;
      const dx = e.touches[0].clientX - drag.startClientX;
      if (!drag.longPressReady) {
        // Only cancel for vertical scroll — horizontal means cross-day intent
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
          if (drag.longPressTimer) { clearTimeout(drag.longPressTimer); drag.longPressTimer = null; }
          drag.scrollCancelled = true;
        }
        return;
      }
      e.preventDefault();
      if (!drag.hasMoved && (Math.abs(dy) > 8 || Math.abs(dx) > 8)) {
        drag.hasMoved = true;
        const el = aptEls.current.get(drag.aptId);
        if (el) { el.style.opacity = '0.25'; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.transition = 'none'; }
        setDraggingId(drag.aptId);
        setDraggingDate(drag.aptDate);
      }
      if (drag.hasMoved && gridRef.current) {
        const maxPx = TOTAL_PX - drag.durationPx;
        const snp = Math.round(Math.max(0, Math.min(maxPx, drag.origTopPx + dy)) / (15 * PPM)) * (15 * PPM);
        drag.currentTopPx = snp;
        // Cross-day: compute which column the finger is over
        const colWidth = (gridRef.current.clientWidth - TW) / 7;
        const newIdx = Math.max(0, Math.min(6, drag.origDayIdx + Math.round(dx / colWidth)));
        drag.targetDayIdx = newIdx;
        if (ghostRef.current) {
          ghostRef.current.style.top  = `${snp}px`;
          ghostRef.current.style.left = `${TW + newIdx * colWidth}px`;
          ghostRef.current.style.width = `${colWidth - 2}px`;
        }
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
      if (el) { el.style.transform = 'scale(1.04)'; el.style.boxShadow = `0 4px 16px rgba(20,18,16,0.2), 0 0 0 1.5px ${col}`; el.style.zIndex = '5'; el.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease'; }
    }, 450);
    const origDayIdx = days.findIndex(d => d.dateStr === apt.date);
    dragRef.current = { aptId: apt.id, aptDate: apt.date, color: col, startTouchY: e.touches[0].clientY, startClientX: e.touches[0].clientX, origDayIdx: origDayIdx >= 0 ? origDayIdx : 0, targetDayIdx: origDayIdx >= 0 ? origDayIdx : 0, origTopPx, durationPx: apt.durationMinutes * PPM, currentTopPx: origTopPx, hasMoved: false, longPressReady: false, longPressTimer: timer, scrollCancelled: false };
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
    if (!drag.longPressReady && !drag.hasMoved) { if (apt.status === 'blocked') { setBlockDelSheet(apt); } else { router.push(`/admin/appointments/${apt.id}`); } return; }
    if (drag.longPressReady && !drag.hasMoved) { if (apt.status === 'blocked') { setBlockDelSheet(apt); } else { router.push(`/admin/appointments/${apt.id}`); } return; }
    if (drag.longPressReady && drag.hasMoved) {
      const newStart = m2t(Math.round(drag.currentTopPx / PPM / 15) * 15);
      const newEnd   = addMin(newStart, apt.durationMinutes);
      const newDate  = days[drag.targetDayIdx]?.dateStr ?? apt.date;
      setDragConfirm({ apt, newStartTime: newStart, newEndTime: newEnd, newDate });
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

  function onAptMouseDown(e: React.MouseEvent, apt: Appointment) {
    if (e.button !== 0) return; // left button only
    e.preventDefault();         // prevent text selection while dragging

    const origTopPx = t2m(apt.startTime) * PPM;
    const col = getAppointmentColor(apt.staff, apt.service);
    const origDayIdx = days.findIndex(d => d.dateStr === apt.date);
    dragRef.current = {
      aptId: apt.id, aptDate: apt.date, color: col,
      startTouchY: e.clientY, startClientX: e.clientX,
      origDayIdx: origDayIdx >= 0 ? origDayIdx : 0,
      targetDayIdx: origDayIdx >= 0 ? origDayIdx : 0,
      origTopPx,
      durationPx: apt.durationMinutes * PPM,
      currentTopPx: origTopPx,
      hasMoved: false, longPressReady: true,
      longPressTimer: null, scrollCancelled: false,
    };

    function onMouseMove(ev: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = ev.clientY - drag.startTouchY;
      const dx = ev.clientX - drag.startClientX;
      if (!drag.hasMoved && (Math.abs(dy) > 4 || Math.abs(dx) > 4)) {
        drag.hasMoved = true;
        const el = aptEls.current.get(drag.aptId);
        if (el) { el.style.opacity = '0.25'; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.transition = 'none'; }
        setDraggingId(drag.aptId);
        setDraggingDate(drag.aptDate);
      }
      if (drag.hasMoved && gridRef.current) {
        const maxPx = TOTAL_PX - drag.durationPx;
        const snp = Math.round(Math.max(0, Math.min(maxPx, drag.origTopPx + dy)) / (15 * PPM)) * (15 * PPM);
        drag.currentTopPx = snp;
        const colWidth = (gridRef.current.clientWidth - TW) / 7;
        const newIdx = Math.max(0, Math.min(6, drag.origDayIdx + Math.round(dx / colWidth)));
        drag.targetDayIdx = newIdx;
        if (ghostRef.current) {
          ghostRef.current.style.top  = `${snp}px`;
          ghostRef.current.style.left = `${TW + newIdx * colWidth}px`;
          ghostRef.current.style.width = `${colWidth - 2}px`;
        }
      }
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const drag = dragRef.current;
      dragRef.current = null;
      clearDragVisuals(apt.id);
      setDraggingId(null);
      setDraggingDate(null);
      if (!drag) return;
      if (!drag.hasMoved) { if (apt.status === 'blocked') { setBlockDelSheet(apt); } else { router.push(`/admin/appointments/${apt.id}`); } return; }
      const newStart = m2t(Math.round(drag.currentTopPx / PPM / 15) * 15);
      const newDate  = days[drag.targetDayIdx]?.dateStr ?? apt.date;
      setDragConfirm({ apt, newStartTime: newStart, newEndTime: addMin(newStart, apt.durationMinutes), newDate });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  async function confirmReschedule() {
    if (!dragConfirm) return;
    const { apt, newStartTime, newEndTime, newDate } = dragConfirm;
    const notify = notifyReschedule;
    setApts((prev) => prev.map((a) => a.id === apt.id
      ? { ...a, date: newDate, startTime: newStartTime, endTime: newEndTime }
      : a
    ));
    setDragConfirm(null);
    setNotifyReschedule(true);
    try {
      await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, startTime: newStartTime, endTime: newEndTime, notify }),
      });
    } catch { /* fail silently */ }
  }

  async function confirmBlock() {
    if (!blockSheet) return;
    const label   = blockLabel.trim() || 'Blocked';
    const endTime = useCustomEnd ? customEndTime : addMin(blockSheet.time, blockDur);
    const dur     = useCustomEnd ? timeDiffWG(blockSheet.time, customEndTime) : blockDur;
    if (dur <= 0) return;
    const staffList = blockSheet.staff === 'all' ? STAFF_IDS : [blockSheet.staff];
    const results = await Promise.all(
      staffList.map((staff) =>
        fetch('/api/admin/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: blockSheet.date, startTime: blockSheet.time, endTime,
            staff, clientName: '', clientEmail: '', clientPhone: '',
            service: label, durationMinutes: dur, price: 0, status: 'blocked',
          }),
        }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      )
    );
    setApts((prev) => [...prev, ...results.filter(Boolean)]);
    setBlockSheet(null);
    setBlockLabel('');
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

  const navArrow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 32,
    color: 'var(--admin-text2)', fontSize: 16, lineHeight: 1,
    flexShrink: 0, cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div
      onTouchStart={(e) => {
        // Don't start swipe tracking if an appointment drag is already beginning
        if (dragRef.current) return;
        swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const sw = swipeRef.current;
        swipeRef.current = null;
        // Abort if a drag was in progress
        if (!sw || dragRef.current?.hasMoved) return;
        const dx = e.changedTouches[0].clientX - sw.startX;
        const dy = e.changedTouches[0].clientY - sw.startY;
        // Require clearly horizontal gesture: 60px minimum, dx at least 2× dy
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
          if (dx < 0) onNextWeek?.();
          else onPrevWeek?.();
        }
      }}
      onTouchCancel={() => { swipeRef.current = null; }}
    >
      {/* ── week nav ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--admin-border-sub)',
        position: 'sticky', top: `calc(${stickyTop}px + var(--admin-safe-top))`, zIndex: 7,
        background: 'var(--admin-bg)',
        transform: navShown ? 'translateY(0)' : `translateY(calc(-100% - ${stickyTop}px - var(--admin-safe-top)))`,
        transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>

        {/* Week range flanked by arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={onPrevWeek} className="lg lg-capsule lg-press" style={navArrow}>‹</button>
          <button
            style={{
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
              color: 'var(--admin-text)', background: 'none', border: 'none',
              cursor: 'default',
              padding: '0 6px', display: 'flex', alignItems: 'center', gap: 6,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {fmtWeekRange(weekStart)}
            {isThisWeek && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4a9b6f', display: 'inline-block' }} />}
          </button>
          <button onClick={onNextWeek} className="lg lg-capsule lg-press" style={navArrow}>›</button>
          {!isThisWeek && onGoCurrentWeek && (
            <button
              onClick={onGoCurrentWeek}
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

        {/* Mode toggle + staff legend (dots only — names don't fit a phone with
            3+ staff and overflowed the page horizontally; colours match blocks) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {modeToggle}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {ROSTER.map((m) => (
              <div key={m.id} title={m.name} style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── day headers ── sticky ─────────────────────────────────────────── */}
      {/* Day-header row — content-layer header, kept opaque (glass is reserved
          for floating chrome per Liquid Glass guidance) */}
      <div style={{ display: 'flex', paddingLeft: TW, position: 'sticky', top: `calc(${stickyTop + (navShown ? NAV_H : 0)}px + var(--admin-safe-top))`, zIndex: 6, transition: 'top 0.25s cubic-bezier(0.22, 1, 0.36, 1)', background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
        {days.map((day) => (
          <div key={day.dateStr} style={{ flex: 1, textAlign: 'center', padding: '8px 2px', opacity: day.isOpen ? 1 : 0.3 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>
              {DAY_ABBR[day.dow]}
            </div>
            {day.isToday ? (
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--admin-btn-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--admin-btn-primary-fg)', lineHeight: 1 }}>{day.dateObj.getDate()}</span>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 400, color: 'var(--admin-text3)', lineHeight: 1.2, marginTop: 2 }}>
                {day.dateObj.getDate()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── time grid ─────────────────────────────────────────────────────── */}
      <div ref={gridRef} style={{ display: 'flex', position: 'relative', paddingBottom: 24, opacity: isLoading ? 0.4 : 1, transition: 'opacity 0.15s ease' }}>

        {/* Hour labels */}
        <div style={{ width: TW, flexShrink: 0, position: 'relative', height: TOTAL_PX }}>
          {HOURS.map((h) => (
            <div key={h} style={{ position: 'absolute', top: (h - H0) * 60 * PPM - 6, right: 4, fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', userSelect: 'none', lineHeight: 1 }}>
              {fmtHour(h)}
            </div>
          ))}
        </div>

        {/* Current-time bar */}
        {showNow && (
          <div ref={nowRef} style={{ position: 'absolute', top: nowMin * PPM, left: TW, right: 0, height: 0, borderTop: '1px solid #b03030', zIndex: 4, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: '50%', background: '#b03030' }} />
          </div>
        )}

        {/* Grid-level drag ghost — floats across day columns */}
        {draggingId && (() => {
          const ghostApt = apts.find(a => a.id === draggingId);
          if (!ghostApt) return null;
          const ghostCol = getAppointmentColor(ghostApt.staff, ghostApt.service);
          const colWidth = gridRef.current ? (gridRef.current.clientWidth - TW) / 7 : 100;
          const origIdx  = days.findIndex(d => d.dateStr === ghostApt.date);
          return (
            <div
              ref={ghostRef}
              style={{
                position: 'absolute',
                top: t2m(ghostApt.startTime) * PPM,
                left: TW + Math.max(0, origIdx) * colWidth,
                width: colWidth - 2,
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

        {/* Day columns */}
        {days.map((day) => {

          return (
            <div
              key={day.dateStr}
              style={{ flex: 1, position: 'relative', height: TOTAL_PX, borderLeft: '1px solid var(--admin-border-sub)', background: day.isToday ? 'var(--admin-today)' : 'transparent' }}
            >
              {/* Hour gridlines */}
              {HOURS.map((h) => (
                <div key={h} style={{ position: 'absolute', top: (h - H0) * 60 * PPM, left: 0, right: 0, borderTop: h === H0 ? 'none' : '1px solid var(--admin-border-sub)', pointerEvents: 'none' }} />
              ))}

              {/* Half-hour gridlines */}
              {HOURS.slice(0, -1).map((h) => (
                <div key={`${h}h`} style={{ position: 'absolute', top: (h - H0) * 60 * PPM + 30 * PPM, left: 0, right: 0, borderTop: '1px solid var(--admin-border-faint)', pointerEvents: 'none' }} />
              ))}

              {/* Closed-hours grey bands — store hours */}
              {(() => {
                const h = hoursByDay ? (hoursByDay[day.dow] ?? null) : null;
                const preH    = hoursByDay ? (h ? Math.max(0, (h[0] - H0) * 60 * PPM) : TOTAL_PX) : 0;
                const postTop = hoursByDay ? (h ? Math.max(0, (h[1] - H0) * 60 * PPM) : 0) : TOTAL_PX;
                const postH   = hoursByDay ? (h ? Math.max(0, TOTAL_PX - postTop) : 0) : 0;
                return (<>
                  {preH > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: preH, background: 'var(--admin-closed-band, rgba(0,0,0,0.045))', pointerEvents: 'none', zIndex: 1 }} />}
                  {postH > 0 && <div style={{ position: 'absolute', top: postTop, left: 0, right: 0, height: postH, background: 'var(--admin-closed-band, rgba(0,0,0,0.045))', pointerEvents: 'none', zIndex: 1 }} />}
                </>);
              })()}

              {/* Tap-to-book slots (15-min buckets for precise back-to-back booking) */}
              {Array.from({ length: (H1 - H0) * 4 }, (_, i) => {
                const s0 = i * 15, s1 = s0 + 15;
                const busy = day.apts.some((a) => t2m(a.startTime) < s1 && t2m(a.endTime) > s0);
                if (busy) return null;
                return (
                  <button
                    key={i}
                    onClick={() => setSlotAction({ date: day.dateStr, time: m2t(s0) })}
                    style={{ position: 'absolute', top: s0 * PPM, left: 0, right: 0, height: 15 * PPM, background: 'none', border: 'none', cursor: 'pointer' }}
                  />
                );
              })}

              {/* Appointment blocks */}
              {day.apts.map((apt) => {
                const topPx = t2m(apt.startTime) * PPM;
                const hPx   = Math.max(apt.durationMinutes * PPM, 14);
                const col   = getAppointmentColor(apt.staff, apt.service);
                const pos   = day.positions.get(apt.id) ?? { leftPct: 0, widthPct: 100 };

                return (
                  <div
                    key={apt.id}
                    ref={(el) => { if (el) aptEls.current.set(apt.id, el); else aptEls.current.delete(apt.id); }}
                    onTouchStart={(e) => onAptTouchStart(e, apt)}
                    onTouchEnd={(e) => onAptTouchEnd(e, apt)}
                    onTouchCancel={() => onAptTouchCancel(apt)}
                    onMouseDown={(e) => onAptMouseDown(e, apt)}
                    style={{
                      position: 'absolute',
                      top: topPx,
                      left: `calc(${pos.leftPct}% + 1px)`,
                      width: `calc(${pos.widthPct}% - 2px)`,
                      height: hPx,
                      background: `${col}22`,
                      border: `1px solid ${col}55`,
                      borderLeft: `2px solid ${col}`,
                      borderRadius: 3,
                      padding: '4px 5px',
                      overflow: 'hidden',
                      cursor: 'grab',
                      touchAction: 'pan-y',
                      zIndex: 2,
                      boxSizing: 'border-box',
                      userSelect: 'none',
                    }}
                  >
                    {apt.status === 'blocked' ? (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', fontStyle: 'italic', lineHeight: 1.2 }}>
                        {apt.service && apt.service !== 'Blocked' ? apt.service : 'Blocked'}
                      </div>
                    ) : (
                      <>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, color: 'var(--admin-text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: apt.notes ? 10 : 0 }}>
                          {apt.clientName}
                        </div>
                        {hPx > 36 && (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-text3)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {apt.service}
                          </div>
                        )}
                        {apt.notes && (
                          <div style={{ position: 'absolute', top: 3, right: 3, fontSize: 10, color: '#b5824a', lineHeight: 1 }}>≡</div>
                        )}
                        {apt.reminderSent && (
                          <div style={{ position: 'absolute', bottom: 3, right: 3, fontSize: 8, color: '#4a9b6f', lineHeight: 1, fontWeight: 600 }}>✓</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Ghost now at grid level — removed per-day ghost */}
            </div>
          );
        })}
      </div>

      {/* ── drag confirm sheet ────────────────────────────────────────────── */}
      {dragConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} onClick={() => setDragConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="lg-sheet lg-bottom-sheet" style={{ padding: '24px 20px 34px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 4 }}>Reschedule</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)', marginBottom: 20 }}>
              Move {dragConfirm.apt.clientName} to{' '}
              <span style={{ color: 'var(--admin-text)' }}>
                {dragConfirm.newDate !== dragConfirm.apt.date
                  ? `${fmtDateShort(dragConfirm.newDate)} · `
                  : ''}{fmt(dragConfirm.newStartTime)} – {fmt(dragConfirm.newEndTime)}
              </span>?
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
                label={dragConfirm.newDate !== dragConfirm.apt.date
                  ? `Move to ${fmtDateShort(dragConfirm.newDate)} at ${fmt(dragConfirm.newStartTime)}`
                  : `Move to ${fmt(dragConfirm.newStartTime)}`}
                variant="primary" onClick={confirmReschedule} />
              <SlotBtn label="Cancel" variant="ghost" onClick={() => setDragConfirm(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── slot action sheet ─────────────────────────────────────────────── */}
      {slotAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setSlotAction(null)}>
          <div onClick={(e) => e.stopPropagation()} className="lg-sheet lg-bottom-sheet" style={{ padding: '20px 20px 34px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', marginBottom: 16, textAlign: 'center' }}>
              {fmtDateShort(slotAction.date)} · {fmt(slotAction.time)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROSTER.map((m) => (
                <SlotBtn key={m.id} label={`Book ${m.name}`} variant="primary" onClick={() => { const { date, time } = slotAction; setSlotAction(null); router.push(`/admin/new-booking?date=${date}&staff=${m.id}&time=${time}`); }} />
              ))}
              <SlotBtn label="Block time off" variant="ghost" onClick={() => {
                const { date, time } = slotAction;
                setSlotAction(null);
                setBlockSheet({ date, time, staff: STAFF_IDS[0] });
                setBlockLabel('');
                setBlockDur(60);
                setUseCustomEnd(false);
                setCustomEndTime(addMin(time, 60));
              }} />
              <SlotBtn label="Cancel" variant="ghost" onClick={() => setSlotAction(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── block-time sheet ──────────────────────────────────────────────── */}
      {blockSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} onClick={() => setBlockSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} className="lg-sheet lg-bottom-sheet" style={{ padding: '24px 20px 34px', overflowY: 'auto', maxHeight: '90vh' }}>

            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 2 }}>Block time off</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', marginBottom: 16 }}>
              {fmtDateShort(blockSheet.date)} · {fmt(blockSheet.time)} – {fmt(useCustomEnd && customEndTime ? customEndTime : addMin(blockSheet.time, blockDur))}
            </div>

            {/* Staff picker */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Staff</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              {[...STAFF_IDS, 'all'].map((s) => (
                <button key={s} onClick={() => setBlockSheet({ ...blockSheet, staff: s })} style={{ flex: '1 0 auto', padding: '10px 8px', borderRadius: 8, border: blockSheet.staff === s ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: blockSheet.staff === s ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: blockSheet.staff === s ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  {s === 'all' ? 'All' : staffName(s)}
                </button>
              ))}
            </div>

            {/* Label chips */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Label</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {QUICK_LABELS_WG.map((lbl) => {
                const active = blockLabel === lbl;
                return (
                  <button key={lbl} onClick={() => setBlockLabel(active ? '' : lbl)} style={{ padding: '7px 12px', borderRadius: 20, border: active ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: active ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: active ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    {lbl}
                  </button>
                );
              })}
            </div>
            <input type="text" value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} placeholder="Custom label…" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-btn)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', outline: 'none', marginBottom: 20 }} />

            {/* Duration */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Duration</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: useCustomEnd ? 10 : 20 }}>
              {[30, 60, 90, 120, 180].map((d) => {
                const active = !useCustomEnd && blockDur === d;
                return <button key={d} onClick={() => { setUseCustomEnd(false); setBlockDur(d); }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: active ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: active ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 12, color: active ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h${d % 60}`}</button>;
              })}
              <button onClick={() => setUseCustomEnd(true)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: useCustomEnd ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: useCustomEnd ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 12, color: useCustomEnd ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Custom</button>
            </div>
            {useCustomEnd && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginBottom: 6 }}>End time</div>
                <select value={customEndTime} onChange={(e) => setCustomEndTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-btn)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', outline: 'none' }}>
                  {endTimeOptionsWG(blockSheet.time).map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SlotBtn label="Block" variant="muted" onClick={confirmBlock} />
              <SlotBtn label="Cancel" variant="ghost" onClick={() => setBlockSheet(null)} />
            </div>
          </div>
        </div>
      )}

      {/* ── block delete sheet ────────────────────────────────────────────── */}
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
  const bg     = variant === 'primary' ? 'var(--admin-btn-primary-bg)' : variant === 'muted' ? 'var(--admin-btn)' : variant === 'danger' ? '#FF3B30' : 'none';
  const fg     = variant === 'primary' ? 'var(--admin-btn-primary-fg)' : variant === 'muted' ? 'var(--admin-text)' : variant === 'danger' ? '#fff' : 'var(--admin-text2)';
  const border = variant === 'ghost'   ? '1px solid var(--admin-border)' : 'none';
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '14px', borderRadius: 10, border, background: bg, color: fg, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: variant === 'primary' ? 500 : 400, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
