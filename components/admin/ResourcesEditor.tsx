'use client';

import { useState } from 'react';
import type { Resource } from '@/lib/resources';
import type { ServiceCategory } from '@/lib/services';
import { staffForCategory, staffName } from '@/lib/staff';

const CATEGORY_LABELS: { value: ServiceCategory; label: string }[] = [
  { value: 'barber', label: 'Barbering' },
  { value: 'tan',    label: 'Sunless Tan' },
  { value: 'wax',    label: 'Waxing' },
  { value: 'lashes', label: 'Lashes' },
];

export default function ResourcesEditor({ initial }: { initial: Resource[] }) {
  const [rooms, setRooms] = useState<Resource[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  function touch() { setSaved(false); setError(''); }

  function rename(id: string, name: string) {
    setRooms(rs => rs.map(r => r.id === id ? { ...r, name } : r));
    touch();
  }

  function toggleCategory(id: string, cat: ServiceCategory) {
    setRooms(rs => rs.map(r => {
      if (r.id !== id) return r;
      const on = r.categories.includes(cat);
      return { ...r, categories: on ? r.categories.filter(c => c !== cat) : [...r.categories, cat] };
    }));
    touch();
  }

  function addRoom() {
    setRooms(rs => [...rs, { id: `room-${Date.now().toString(36)}`, name: '', categories: [] }]);
    touch();
  }

  function removeRoom(id: string) {
    setRooms(rs => rs.filter(r => r.id !== id));
    touch();
  }

  async function handleSave() {
    if (rooms.some(r => !r.name.trim())) {
      setError('Every room needs a name.');
      return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rooms),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      const json = await res.json();
      setRooms(json.resources);
      setSaved(true);
      if (!json.persisted) {
        setError('Saved in memory only — run the settings SQL in Supabase to persist across restarts.');
      }
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '24px 20px 64px' }}>
      <h1 style={{
        fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
        color: 'var(--admin-text)', margin: '0 0 8px', letterSpacing: '-0.01em',
      }}>
        Shared Resources
      </h1>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)',
        lineHeight: 1.55, margin: '0 0 28px',
      }}>
        A room can only hold one appointment at a time. Tick the services that
        happen in each room and the booking calendar will stop them overlapping —
        even when the staff are different people and both are free.
      </p>

      {rooms.length === 0 && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)',
          padding: '20px 0', textAlign: 'center',
        }}>
          No shared rooms. Every service can be booked independently.
        </p>
      )}

      {rooms.map((room) => (
        <div key={room.id} style={{
          background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
          borderRadius: 12, padding: 16, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input
              value={room.name}
              placeholder="Room name"
              onChange={(e) => rename(room.id, e.target.value)}
              style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box',
                background: 'var(--admin-btn)', border: '1px solid var(--admin-border)',
                borderRadius: 8, padding: '10px 12px',
                fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--admin-text)',
                outline: 'none',
              }}
            />
            <button
              onClick={() => removeRoom(room.id)}
              aria-label={`Remove ${room.name || 'room'}`}
              style={{
                flexShrink: 0, width: 38, height: 38, borderRadius: 9999,
                border: '1px solid var(--admin-border)', background: 'none',
                color: 'var(--admin-danger, #c0392b)', fontSize: 15, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 10,
          }}>
            Services in this room
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORY_LABELS.map(({ value, label }) => {
              const on = room.categories.includes(value);
              const who = staffForCategory(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleCategory(room.id, value)}
                  style={{
                    padding: '8px 13px', borderRadius: 20, cursor: 'pointer',
                    border: on ? '1.5px solid #7db83e' : '1px solid var(--admin-border)',
                    background: on ? 'rgba(125,184,62,0.15)' : 'var(--admin-btn)',
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    fontWeight: on ? 500 : 400,
                    color: on ? 'var(--admin-text)' : 'var(--admin-text2)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {label}
                  {who && (
                    <span style={{ color: 'var(--admin-muted)', fontWeight: 400 }}>
                      {' · '}{staffName(who)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {room.categories.length === 1 && (
            <p style={{
              margin: '12px 0 0', fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'var(--admin-muted)', lineHeight: 1.5,
            }}>
              Only one service uses this room, so nothing is being held back.
              Add a second to make it a shared resource.
            </p>
          )}
        </div>
      ))}

      <button
        onClick={addRoom}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 4px', background: 'none', border: 'none',
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>
        Add a room
      </button>

      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: 14,
            background: saved && !error ? '#7db83e' : 'var(--admin-btn-primary-bg)',
            color: saved && !error ? '#fff' : 'var(--admin-btn-primary-fg)',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
            border: 'none', borderRadius: 12,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'background 0.2s, color 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>

        {error && (
          <p style={{
            marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12,
            color: saved ? 'var(--admin-muted)' : 'var(--admin-error)', lineHeight: 1.5,
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
