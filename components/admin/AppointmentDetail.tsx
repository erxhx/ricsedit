'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Appointment, AppointmentStatus } from '@/lib/admin-mock';
import { getAppointmentColor } from '@/lib/appointment-colors';

// Time slots 9 am – 7 pm in 15-min increments
const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 19; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 19 && m > 0) break;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function fmtDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

const STAFF_NAME: Record<string, string> = { eric: 'Eric', livi: 'Livi' };

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  confirmed: '#4a9b6f',
  completed: '#5a7a9b',
  cancelled: '#8b3a3a',
  blocked: '#4a4844',
};

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

function fmtDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function AppointmentDetail({
  apt: initial,
  history = [],
}: {
  apt: Appointment;
  history?: Appointment[];
}) {
  const [apt, setApt] = useState(initial);
  const [note, setNote] = useState(initial.notes ?? '');
  const [editingNote, setEditingNote] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [reschedDate, setReschedDate] = useState(initial.date);
  const [reschedTime, setReschedTime] = useState(initial.startTime);
  const [linkCopied, setLinkCopied] = useState(false);

  const color = getAppointmentColor(apt.staff, apt.service);

  function copyManageLink() {
    const url = `${window.location.origin}/booking/manage/${apt.manageToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }
  const isActive = apt.status === 'confirmed';

  function saveNote() {
    setApt((a) => ({ ...a, notes: note.trim() || undefined }));
    setEditingNote(false);
    // TODO: PATCH /api/appointments/[id] when Supabase is connected
  }

  function markComplete() {
    setApt((a) => ({ ...a, status: 'completed' }));
    // TODO: PATCH /api/appointments/[id]
  }

  function cancelAppointment() {
    setApt((a) => ({ ...a, status: 'cancelled' }));
    setShowCancelConfirm(false);
    // TODO: PATCH /api/appointments/[id] + trigger cancellation email/SMS
  }

  function rescheduleAppointment() {
    const newEnd = addMinutes(reschedTime, apt.durationMinutes);
    setApt((a) => ({ ...a, date: reschedDate, startTime: reschedTime, endTime: newEnd }));
    setShowReschedule(false);
    // TODO: PATCH /api/appointments/[id] + trigger reschedule notification
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 52,
        borderBottom: '1px solid #252320',
        position: 'sticky', top: 52, background: '#0d0c0a', zIndex: 8,
      }}>
        <Link href="/admin" style={{ color: '#6b6760', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>
          ‹
        </Link>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760' }}>
          {fmtDate(apt.date)}
        </span>
      </div>

      <div style={{ padding: '28px 20px 0' }}>
        {/* Client name + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <h1 style={{
            fontFamily: 'var(--font-body)', fontSize: 26, fontWeight: 400,
            color: '#ece9e2', margin: 0, letterSpacing: '-0.01em',
          }}>
            {apt.clientName}
          </h1>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500,
            color: STATUS_COLOR[apt.status],
            background: STATUS_COLOR[apt.status] + '22',
            padding: '4px 10px', borderRadius: 20,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', marginTop: 4, marginLeft: 12,
          }}>
            {STATUS_LABEL[apt.status]}
          </span>
        </div>

        {/* Service + time */}
        <Section>
          <Row label="Service" value={apt.service} />
          <Row label="Time" value={`${fmtTime(apt.startTime)} – ${fmtTime(apt.endTime)}`} />
          <Row label="Duration" value={`${apt.durationMinutes} min`} />
          <Row label="Price" value={`$${apt.price}`} />
          <Row label="Staff">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2' }}>{STAFF_NAME[apt.staff]}</span>
            </span>
          </Row>
        </Section>

        {/* Contact */}
        <Section label="Contact">
          <Row label="Email">
            <a href={`mailto:${apt.clientEmail}`} style={{ color: '#7a9bbf', fontFamily: 'var(--font-body)', fontSize: 14, textDecoration: 'none' }}>
              {apt.clientEmail}
            </a>
          </Row>
          <Row label="Phone" last>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2' }}>
              {apt.clientPhone}
            </span>
          </Row>
        </Section>

        {/* Call + Text quick actions */}
        {apt.clientPhone && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <a
              href={`tel:${apt.clientPhone}`}
              style={{
                flex: 1, textAlign: 'center',
                padding: '13px 0', borderRadius: 10,
                border: '1px solid #2a4a32',
                background: '#192b1e',
                color: '#6ab87a',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Call
            </a>
            <a
              href={`sms:${apt.clientPhone}`}
              style={{
                flex: 1, textAlign: 'center',
                padding: '13px 0', borderRadius: 10,
                border: '1px solid #2a3a4e',
                background: '#192535',
                color: '#7a9bbf',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Text
            </a>
          </div>
        )}

        {/* Manage link — share with client for self-serve cancel/reschedule */}
        {apt.status === 'confirmed' && (
          <button
            onClick={copyManageLink}
            style={{
              width: '100%', marginTop: 8, padding: '13px 0',
              borderRadius: 10, border: '1px solid #252320',
              background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: linkCopied ? '#4a9b6f' : '#6b6760',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.2s',
            }}
          >
            {linkCopied ? '✓ Link copied' : 'Copy manage link'}
          </button>
        )}

        {/* Notes */}
        <Section label="Notes">
          {editingNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                autoFocus
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#1c1b18', border: '1px solid #3a3835',
                  borderRadius: 8, padding: '10px 12px',
                  fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2',
                  resize: 'none', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton onClick={saveNote} variant="primary">Save</ActionButton>
                <ActionButton onClick={() => { setNote(apt.notes ?? ''); setEditingNote(false); }} variant="ghost">Cancel</ActionButton>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingNote(true)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: 0, cursor: 'pointer',
              }}
            >
              {apt.notes ? (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2', lineHeight: 1.5 }}>
                  {apt.notes}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#3a3835', fontStyle: 'italic' }}>
                  Tap to add a note…
                </span>
              )}
            </button>
          )}
        </Section>

        {/* Client history */}
        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#4a4844', marginBottom: 10,
            }}>
              History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((h) => {
                const today = new Date().toISOString().slice(0, 10);
                const isUpcoming = h.date >= today;
                const col = getAppointmentColor(h.staff, h.service);
                const [y, mo, d] = h.date.split('-').map(Number);
                const dateLabel = new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
                  weekday: 'short', month: 'short', day: 'numeric',
                });
                return (
                  <Link
                    key={h.id}
                    href={`/admin/appointments/${h.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: '#161513', border: '1px solid #252320',
                      borderLeft: `2.5px solid ${h.status === 'cancelled' ? '#3a3835' : col}`,
                      borderRadius: 10, padding: '12px 14px',
                      textDecoration: 'none',
                      opacity: h.status === 'cancelled' ? 0.5 : 1,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {/* Date */}
                    <div style={{ minWidth: 72 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: isUpcoming ? '#ece9e2' : '#6b6760', fontWeight: isUpcoming ? 500 : 400 }}>
                        {dateLabel}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#3a3835', marginTop: 2 }}>
                        {fmtTime(h.startTime)}
                      </div>
                    </div>

                    {/* Service + staff */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#ece9e2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.service}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: col, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#4a4844' }}>
                          {STAFF_NAME[h.staff]}
                        </span>
                      </div>
                    </div>

                    {/* Price + status */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#ece9e2' }}>
                        ${h.price}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 10,
                        color: STATUS_COLOR[h.status],
                        marginTop: 2, textTransform: 'capitalize',
                      }}>
                        {h.status}
                      </div>
                    </div>

                    <span style={{ fontSize: 14, color: '#3a3835', flexShrink: 0 }}>›</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions — only for active appointments */}
        {isActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
            <ActionButton onClick={markComplete} variant="primary">Mark as complete</ActionButton>
            <ActionButton onClick={() => { setReschedDate(apt.date); setReschedTime(apt.startTime); setShowReschedule(true); }} variant="ghost">Reschedule</ActionButton>
            <ActionButton onClick={() => setShowCancelConfirm(true)} variant="danger">Cancel appointment</ActionButton>
          </div>
        )}

        {apt.status === 'completed' && (
          <div style={{ marginTop: 32, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 13, color: '#4a9b6f' }}>
            Appointment completed
          </div>
        )}
      </div>

      {/* Reschedule sheet */}
      {showReschedule && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end', zIndex: 100,
        }} onClick={() => setShowReschedule(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: '#1c1b18',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 48px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: '#ece9e2', marginBottom: 4 }}>
              Reschedule
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#4a4844', marginBottom: 20 }}>
              Currently {fmtDate(apt.date)} at {fmtTime(apt.startTime)}
            </div>

            {/* Date + time pickers */}
            <div style={{
              background: '#161513', border: '1px solid #252320',
              borderRadius: 10, overflow: 'hidden',
              padding: '4px 16px', marginBottom: 20,
            }}>
              {/* Date row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0', borderBottom: '1px solid #1e1d1a',
              }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760', flexShrink: 0, marginRight: 16 }}>
                  Date
                </span>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flex: 1, minHeight: 24 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2', pointerEvents: 'none', userSelect: 'none' }}>
                    {fmtDateDisplay(reschedDate)}
                  </span>
                  <input
                    type="date"
                    value={reschedDate}
                    onChange={(e) => setReschedDate(e.target.value)}
                    style={{
                      position: 'absolute', inset: '-11px -16px',
                      opacity: 0.01, cursor: 'pointer',
                      fontSize: 16,
                    }}
                  />
                </div>
              </div>

              {/* Time row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0',
              }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760', flexShrink: 0, marginRight: 16 }}>
                  Time
                </span>
                <select
                  value={reschedTime}
                  onChange={(e) => setReschedTime(e.target.value)}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2',
                    cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
                    colorScheme: 'dark',
                  }}
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t} style={{ background: '#1c1b18', color: '#ece9e2' }}>
                      {fmtTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration reminder */}
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a4844',
              textAlign: 'center', marginBottom: 20,
            }}>
              {fmtTime(reschedTime)} – {fmtTime(addMinutes(reschedTime, apt.durationMinutes))} · {apt.durationMinutes} min
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ActionButton onClick={rescheduleAppointment} variant="primary">
                Move to {fmtDate(reschedDate)} at {fmtTime(reschedTime)}
              </ActionButton>
              <ActionButton onClick={() => setShowReschedule(false)} variant="ghost">Keep current time</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation sheet */}
      {showCancelConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end', zIndex: 100,
        }} onClick={() => setShowCancelConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: '#1c1b18',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 40px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: '#ece9e2', marginBottom: 8 }}>
              Cancel appointment?
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#6b6760', marginBottom: 24, lineHeight: 1.5 }}>
              {apt.clientName}'s {apt.service} on {fmtDate(apt.date)} at {fmtTime(apt.startTime)} will be cancelled.
              {' '}A cancellation notification will be sent when the database is connected.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ActionButton onClick={cancelAppointment} variant="danger">Yes, cancel it</ActionButton>
              <ActionButton onClick={() => setShowCancelConfirm(false)} variant="ghost">Keep appointment</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      {label && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#4a4844', marginBottom: 10,
        }}>
          {label}
        </div>
      )}
      <div style={{ background: '#161513', border: '1px solid #252320', borderRadius: 10, overflow: 'hidden', padding: '4px 16px' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, children, last = false }: { label: string; value?: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 0', borderBottom: last ? 'none' : '1px solid #1e1d1a',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760', flexShrink: 0, marginRight: 16 }}>
        {label}
      </span>
      {children ?? (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2', textAlign: 'right' }}>
          {value}
        </span>
      )}
    </div>
  );
}

function ActionButton({
  onClick, variant, children,
}: {
  onClick: () => void;
  variant: 'primary' | 'danger' | 'ghost';
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#ece9e2', color: '#0d0c0a' },
    danger:  { background: '#3a1a1a', color: '#c47a7a', border: '1px solid #5a2a2a' },
    ghost:   { background: 'none', color: '#6b6760', border: '1px solid #252320' },
  };
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px', borderRadius: 10, border: 'none',
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
        cursor: 'pointer', textAlign: 'center',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}
