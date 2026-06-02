'use client';
import { useState, useEffect } from 'react';
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
  no_show: 'No show',
};
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  confirmed: '#4a9b6f',
  completed: '#5a7a9b',
  cancelled: '#8b3a3a',
  blocked: '#9a9590',
  no_show: '#b5824a',
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
  const [note,          setNote]          = useState(initial.notes ?? '');
  const [editingNote,      setEditingNote]      = useState(false);

  // Client-level persistent notes
  const [clientNotes,        setClientNotes]        = useState('');
  const [draftClientNotes,   setDraftClientNotes]   = useState('');
  const [editingClientNotes, setEditingClientNotes] = useState(false);
  const [savingClientNotes,  setSavingClientNotes]  = useState(false);
  const [clientNotesSaved,   setClientNotesSaved]   = useState(false);

  useEffect(() => {
    if (!initial.clientPhone) return;
    fetch(`/api/admin/clients/notes?phone=${encodeURIComponent(initial.clientPhone)}`)
      .then(r => r.json())
      .then(d => { setClientNotes(d.notes ?? ''); setDraftClientNotes(d.notes ?? ''); })
      .catch(() => {});
  }, [initial.clientPhone]);

  async function saveClientNotes() {
    setSavingClientNotes(true);
    try {
      await fetch('/api/admin/clients/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: apt.clientPhone, notes: draftClientNotes }),
      });
      setClientNotes(draftClientNotes);
      setEditingClientNotes(false);
      setClientNotesSaved(true);
      setTimeout(() => setClientNotesSaved(false), 2000);
    } finally {
      setSavingClientNotes(false);
    }
  }
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [notifyReschedule, setNotifyReschedule] = useState(true);
  const [reschedDate, setReschedDate] = useState(initial.date);
  const [reschedTime, setReschedTime] = useState(initial.startTime);
  const [linkCopied, setLinkCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const [noShowSms, setNoShowSms] = useState(false);

  async function patchApt(patch: Record<string, unknown>): Promise<Appointment | null> {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return null;
      return await res.json() as Appointment;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }

  const color = getAppointmentColor(apt.staff, apt.service);

  function copyManageLink() {
    const url = `${window.location.origin}/booking/manage/${apt.manageToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }
  const isActive = apt.status === 'confirmed';

  async function saveNote() {
    const trimmed = note.trim() || undefined;
    const updated = await patchApt({ notes: trimmed ?? null });
    if (updated) setApt(updated);
    setEditingNote(false);
  }

  async function markComplete() {
    const updated = await patchApt({ status: 'completed' });
    if (updated) setApt(updated);
  }

  async function cancelAppointment() {
    const updated = await patchApt({ status: 'cancelled' });
    if (updated) setApt(updated);
    setShowCancelConfirm(false);
  }

  async function markNoShow() {
    const updated = await patchApt({ status: 'no_show', noShowSms });
    if (updated) setApt(updated);
    setShowNoShowConfirm(false);
    setNoShowSms(false); // reset for next use
  }

  async function rescheduleAppointment() {
    const newEnd = addMinutes(reschedTime, apt.durationMinutes);
    const updated = await patchApt({ date: reschedDate, startTime: reschedTime, endTime: newEnd, notify: notifyReschedule });
    if (updated) setApt(updated);
    setShowReschedule(false);
    setNotifyReschedule(true); // reset for next use
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 52,
        borderBottom: '1px solid var(--admin-border)',
        position: 'sticky', top: 52, background: 'var(--admin-bg)', zIndex: 8,
      }}>
        <Link href="/admin" style={{ color: 'var(--admin-text2)', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>
          ‹
        </Link>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)' }}>
          {fmtDate(apt.date)}
        </span>
      </div>

      <div style={{ padding: '28px 20px 0' }}>
        {/* Client name + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <h1 style={{
            fontFamily: 'var(--font-body)', fontSize: 26, fontWeight: 400,
            color: 'var(--admin-text)', margin: 0, letterSpacing: '-0.01em',
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

        {/* Reminder sent badge */}
        {apt.reminderSent && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            marginBottom: 16,
            padding: '5px 10px', borderRadius: 20,
            background: '#4a9b6f18', border: '1px solid #4a9b6f44',
          }}>
            <span style={{ fontSize: 11, color: '#4a9b6f', lineHeight: 1 }}>✓</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#4a9b6f', letterSpacing: '0.04em' }}>
              Reminder sent
            </span>
          </div>
        )}

        {/* Service + time */}
        <Section>
          <Row label="Service" value={apt.service} />
          <Row label="Time" value={`${fmtTime(apt.startTime)} – ${fmtTime(apt.endTime)}`} />
          <Row label="Duration" value={`${apt.durationMinutes} min`} />
          <Row label="Price" value={`$${apt.price}`} />
          <Row label="Staff">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>{STAFF_NAME[apt.staff]}</span>
            </span>
          </Row>
        </Section>

        {/* Contact */}
        <Section label="Contact">
          <Row label="Email">
            <a href={`mailto:${apt.clientEmail}`} style={{ color: 'var(--admin-link)', fontFamily: 'var(--font-body)', fontSize: 14, textDecoration: 'none' }}>
              {apt.clientEmail}
            </a>
          </Row>
          <Row label="Phone" last>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>
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
                border: 'none',
                background: '#34C759',
                color: '#fff',
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
                border: 'none',
                background: '#007AFF',
                color: '#fff',
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
              borderRadius: 10, border: '1px solid var(--admin-border)',
              background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: linkCopied ? '#4a9b6f' : 'var(--admin-text2)',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.2s',
            }}
          >
            {linkCopied ? '✓ Link copied' : 'Copy manage link'}
          </button>
        )}

        {/* Client note — submitted at booking time */}
        <Section label="Client note">
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
                  background: 'var(--admin-btn)', border: '1px solid var(--admin-border)',
                  borderRadius: 8, padding: '10px 12px',
                  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
                  resize: 'vertical', outline: 'none', minHeight: 80,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton onClick={saveNote} variant="primary" disabled={saving}>Save</ActionButton>
                <ActionButton onClick={() => { setNote(apt.notes ?? ''); setEditingNote(false); }} variant="ghost" disabled={saving}>Cancel</ActionButton>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingNote(true)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              {apt.notes ? (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block' }}>
                  {apt.notes}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-muted)', fontStyle: 'italic' }}>
                  Tap to add a note…
                </span>
              )}
            </button>
          )}
        </Section>

        {/* Admin notes — persistent across all appointments, internal only */}
        <Section label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Admin notes
            {clientNotesSaved && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#4a9b6f', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                ✓ Saved
              </span>
            )}
          </span>
        }>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Internal only
          </div>
          {editingClientNotes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={draftClientNotes}
                onChange={e => setDraftClientNotes(e.target.value)}
                placeholder="Formula, allergies, preferences, internal notes…"
                autoFocus
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--admin-btn)', border: '1px solid var(--admin-border)',
                  borderRadius: 8, padding: '10px 12px',
                  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
                  resize: 'vertical', outline: 'none', minHeight: 80,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton onClick={saveClientNotes} variant="primary" disabled={savingClientNotes}>Save</ActionButton>
                <ActionButton onClick={() => { setDraftClientNotes(clientNotes); setEditingClientNotes(false); }} variant="ghost" disabled={savingClientNotes}>Cancel</ActionButton>
              </div>
            </div>
          ) : (
            <button onClick={() => { setDraftClientNotes(clientNotes); setEditingClientNotes(true); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              {clientNotes ? (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block' }}>
                  {clientNotes}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-muted)', fontStyle: 'italic' }}>
                  Tap to add client notes…
                </span>
              )}
            </button>
          )}
        </Section>

        {/* Client history */}
        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            {(() => {
              const noShows = history.filter(h => h.status === 'no_show').length;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--admin-muted)' }}>
                    History
                  </div>
                  {noShows > 0 && (
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500,
                      color: '#b5824a', background: '#b5824a22',
                      border: '1px solid #b5824a44',
                      borderRadius: 4, padding: '1px 6px', letterSpacing: '0.04em',
                    }}>
                      {noShows} no-show{noShows !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })()}
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
                      background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
                      borderLeft: `2.5px solid ${h.status === 'cancelled' ? 'var(--admin-border)' : col}`,
                      borderRadius: 10, padding: '12px 14px',
                      textDecoration: 'none',
                      opacity: h.status === 'cancelled' ? 0.55 : 1,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {/* Date */}
                    <div style={{ minWidth: 72 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: isUpcoming ? 'var(--admin-text)' : 'var(--admin-text3)', fontWeight: isUpcoming ? 500 : 400 }}>
                        {dateLabel}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                        {fmtTime(h.startTime)}
                      </div>
                    </div>

                    {/* Service + staff */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.service}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: col, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)' }}>
                          {STAFF_NAME[h.staff]}
                        </span>
                      </div>
                    </div>

                    {/* Price + status */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)' }}>
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

                    <span style={{ fontSize: 14, color: 'var(--admin-muted)', flexShrink: 0 }}>›</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions — only for active appointments */}
        {isActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
            <ActionButton onClick={markComplete} variant="primary" disabled={saving}>Mark as complete</ActionButton>
            <ActionButton onClick={() => { setReschedDate(apt.date); setReschedTime(apt.startTime); setShowReschedule(true); }} variant="ghost" disabled={saving}>Reschedule</ActionButton>
            <ActionButton onClick={() => setShowNoShowConfirm(true)} variant="noshow" disabled={saving}>Mark as no-show</ActionButton>
            <ActionButton onClick={() => setShowCancelConfirm(true)} variant="danger" disabled={saving}>Cancel appointment</ActionButton>
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', zIndex: 100,
        }} onClick={() => setShowReschedule(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--admin-sheet)',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 48px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 4 }}>
              Reschedule
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', marginBottom: 20 }}>
              Currently {fmtDate(apt.date)} at {fmtTime(apt.startTime)}
            </div>

            {/* Date + time pickers */}
            <div style={{
              background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
              borderRadius: 10, overflow: 'hidden',
              padding: '4px 16px', marginBottom: 20,
            }}>
              {/* Date row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0', borderBottom: '1px solid var(--admin-border-sub)',
              }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', flexShrink: 0, marginRight: 16 }}>
                  Date
                </span>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flex: 1, minHeight: 24 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', pointerEvents: 'none', userSelect: 'none' }}>
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
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', flexShrink: 0, marginRight: 16 }}>
                  Time
                </span>
                <select
                  value={reschedTime}
                  onChange={(e) => setReschedTime(e.target.value)}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
                    cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
                  }}
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t} style={{ background: 'var(--admin-sheet)', color: 'var(--admin-text)' }}>
                      {fmtTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration reminder */}
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)',
              textAlign: 'center', marginBottom: 20,
            }}>
              {fmtTime(reschedTime)} – {fmtTime(addMinutes(reschedTime, apt.durationMinutes))} · {apt.durationMinutes} min
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
              <ActionButton onClick={rescheduleAppointment} variant="primary" disabled={saving}>
                Move to {fmtDate(reschedDate)} at {fmtTime(reschedTime)}
              </ActionButton>
              <ActionButton onClick={() => setShowReschedule(false)} variant="ghost" disabled={saving}>Keep current time</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation sheet */}
      {showCancelConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', zIndex: 100,
        }} onClick={() => setShowCancelConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--admin-sheet)',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 40px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 8 }}>
              Cancel appointment?
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)', marginBottom: 24, lineHeight: 1.5 }}>
              {apt.clientName}&#39;s {apt.service} on {fmtDate(apt.date)} at {fmtTime(apt.startTime)} will be cancelled.
              {' '}An email and SMS will be sent letting them know.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ActionButton onClick={cancelAppointment} variant="danger" disabled={saving}>Yes, cancel it</ActionButton>
              <ActionButton onClick={() => setShowCancelConfirm(false)} variant="ghost" disabled={saving}>Keep appointment</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* No-show confirmation sheet */}
      {showNoShowConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', zIndex: 100,
        }} onClick={() => setShowNoShowConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--admin-sheet)',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 40px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 8 }}>
              Mark as no-show?
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)', marginBottom: 20, lineHeight: 1.5 }}>
              {apt.clientName} didn't show up for their {apt.service} on {fmtDate(apt.date)} at {fmtTime(apt.startTime)}.
              {' '}A "we missed you" email will be sent and this will be recorded on their history.
            </div>
            {/* Also send SMS toggle */}
            <button
              onClick={() => setNoShowSms(s => !s)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', marginBottom: 16 }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>Also send SMS</span>
              <span style={{ width: 44, height: 26, borderRadius: 13, background: noShowSms ? '#34C759' : 'var(--admin-border)', display: 'flex', alignItems: 'center', padding: '0 3px', transition: 'background 0.2s', justifyContent: noShowSms ? 'flex-end' : 'flex-start', flexShrink: 0 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </span>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ActionButton onClick={markNoShow} variant="noshow" disabled={saving}>Yes, mark as no-show</ActionButton>
              <ActionButton onClick={() => setShowNoShowConfirm(false)} variant="ghost" disabled={saving}>They showed up</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      {label && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 10,
        }}>
          {label}
        </div>
      )}
      <div style={{ background: 'rgba(252,248,240,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '4px 16px' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, children, last = false }: { label: string; value?: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--admin-border-sub)',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', flexShrink: 0, marginRight: 16 }}>
        {label}
      </span>
      {children ?? (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', textAlign: 'right' }}>
          {value}
        </span>
      )}
    </div>
  );
}

function ActionButton({
  onClick, variant, children, disabled,
}: {
  onClick: () => void;
  variant: 'primary' | 'danger' | 'ghost' | 'noshow';
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--admin-btn-primary-bg)', color: 'var(--admin-btn-primary-fg)' }, // black
    danger:  { background: '#FF3B30', color: '#fff' },  // iOS red — cancel
    ghost:   { background: '#fff', color: '#000', border: '1px solid rgba(0,0,0,0.12)' },        // white
    noshow:  { background: '#FF9500', color: '#fff' },  // iOS orange — no-show
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '14px', borderRadius: 12, border: 'none',
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer', textAlign: 'center',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}
