'use client';
import { useState, useEffect, useRef } from 'react';
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

  const [notes, setNotes]         = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes]     = useState('');
  const [savingNotes, setSavingNotes]   = useState(false);
  const [savedFlash, setSavedFlash]     = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!phone) return;
    fetch(`/api/admin/clients/notes?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(d => { setNotes(d.notes ?? ''); setDraftNotes(d.notes ?? ''); })
      .catch(() => {});
  }, [phone]);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await fetch('/api/admin/clients/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, notes: draftNotes }),
      });
      setNotes(draftNotes);
      setEditingNotes(false);
      setSavedFlash(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Sub-header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 44,
        borderBottom: '1px solid var(--admin-border)',
        position: 'sticky', top: 52, background: 'var(--admin-bg)', zIndex: 8,
      }}>
        <Link href="/admin/clients" style={{
          color: 'var(--admin-text3)', textDecoration: 'none',
          fontSize: 18, lineHeight: 1,
        }}>‹</Link>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)',
        }}>
          Clients
        </span>
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        {/* Name */}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 600,
          color: 'var(--admin-text)', marginBottom: 4,
        }}>
          {name}
        </div>

        {/* Contact */}
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {email && (
            <a href={`mailto:${email}`} style={{
              fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text2)',
              textDecoration: 'none',
            }}>
              {email}
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} style={{
              fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text2)',
              textDecoration: 'none',
            }}>
              {phone}
            </a>
          )}
          {!email && !phone && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
              No contact info
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, background: 'var(--admin-border)',
          border: '1px solid var(--admin-border)', borderRadius: 10, overflow: 'hidden',
          marginBottom: 28,
        }}>
          {[
            { label: 'Visits', value: String(completed.length) },
            { label: 'Total spent', value: `$${totalSpent}` },
            { label: 'Last visit', value: lastVisit ? new Date(lastVisit + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'var(--admin-card)', padding: '14px 12px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600,
                color: 'var(--admin-text)', lineHeight: 1,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--admin-muted)', marginTop: 5,
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Admin notes */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--admin-muted)',
            }}>
              Admin notes
            </div>
            {savedFlash && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#4a9b6f' }}>
                ✓ Saved
              </span>
            )}
          </div>

          <div style={{
            background: 'var(--admin-card)',
            border: '1px solid var(--admin-border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            {editingNotes ? (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={draftNotes}
                  onChange={e => setDraftNotes(e.target.value)}
                  placeholder="Formula, allergies, preferences, internal notes…"
                  autoFocus
                  rows={5}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--admin-btn)', border: '1px solid var(--admin-border)',
                    borderRadius: 8, padding: '10px 12px',
                    fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
                    resize: 'vertical', outline: 'none', minHeight: 100,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    style={{
                      flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                      background: 'var(--admin-btn-primary-bg)', color: 'var(--admin-btn-primary-fg)',
                      fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setDraftNotes(notes); setEditingNotes(false); }}
                    disabled={savingNotes}
                    style={{
                      flex: 1, padding: '11px 0', borderRadius: 8,
                      border: '1px solid var(--admin-border)',
                      background: 'none', color: 'var(--admin-text2)',
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setDraftNotes(notes); setEditingNotes(true); }}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '13px 14px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                {notes ? (
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
                    lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block',
                  }}>
                    {notes}
                  </span>
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 14,
                    color: 'var(--admin-muted)', fontStyle: 'italic',
                  }}>
                    Tap to add notes…
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Appointment history */}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--admin-muted)', marginBottom: 10,
        }}>
          Appointment history
        </div>

        {appointments.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--admin-muted)', padding: '16px 0',
          }}>
            No appointments yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appointments.map((apt) => {
              const color = apt.staff === 'eric'
                ? SERVICE_COLORS.ericBarber
                : SERVICE_COLORS.liviWax;
              const status = STATUS_LABELS[apt.status] ?? { label: apt.status, color: 'var(--admin-muted)' };
              return (
                <Link
                  key={apt.id}
                  href={`/admin/appointments/${apt.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
                    borderRadius: 10, padding: '13px 14px',
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 14,
                        color: 'var(--admin-text)', fontWeight: 500,
                      }}>
                        {apt.service}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        color: 'var(--admin-text3)', flexShrink: 0,
                      }}>
                        ${apt.price}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginTop: 5,
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-text3)',
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
