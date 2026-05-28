'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ClientSummary } from '@/lib/db';

function fmtDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function ClientList({ clients }: { clients: ClientSummary[] }) {
  const [query, setQuery] = useState('');

  const filtered = query.trim().length === 0
    ? clients
    : clients.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
        );
      });

  return (
    <div>
      {/* Search bar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #d4cfc6',
        position: 'sticky', top: 52, background: '#efeae0', zIndex: 7,
      }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#f7f3eb', border: '1px solid #d4cfc6',
            borderRadius: 8, padding: '9px 14px',
            fontFamily: 'var(--font-body)', fontSize: 14, color: '#141210',
            outline: 'none', colorScheme: 'light',
          }}
        />
      </div>

      {/* Count */}
      <div style={{
        padding: '10px 16px',
        fontFamily: 'var(--font-body)', fontSize: 11,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: '#9a9590',
      }}>
        {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          fontFamily: 'var(--font-body)', fontSize: 13, color: '#9a9590',
        }}>
          {query ? 'No clients match that search.' : 'No clients yet.'}
        </div>
      ) : (
        <div>
          {filtered.map((c) => (
            <Link
              key={c.name}
              href={`/admin/clients/${encodeURIComponent(c.name)}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid #e0dbd2',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 12,
              }}>
                {/* Left: name + last service */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 14,
                    color: '#141210', fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {c.name}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 12,
                    color: '#9a9590', marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {c.lastService}
                  </div>
                </div>

                {/* Right: visit count + last date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, color: '#6a6560',
                  }}>
                    {fmtDate(c.lastVisit)}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 11,
                    color: '#9a9590', marginTop: 2,
                    letterSpacing: '0.04em',
                  }}>
                    {c.visitCount} visit{c.visitCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
