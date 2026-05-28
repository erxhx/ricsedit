'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Read directly from DOM — autofill on iOS doesn't fire onChange
    const pw = inputRef.current?.value || password;
    if (!pw) { setError('Please enter your passphrase.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        window.location.href = '/admin';
      } else {
        const data = await res.json();
        setError(data.error ?? 'Incorrect passphrase');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--admin-bg)',
      padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 320 }}>
        {/* Logo / wordmark */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--admin-text)', fontWeight: 500 }}>
            EDIT STUDIO
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--admin-muted)', marginTop: 4 }}>
            ADMIN
          </div>
        </div>

        <form onSubmit={submit}>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your passphrase"
            autoComplete="current-password"
            autoFocus
            required
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--admin-card)',
              border: `1px solid ${error ? 'var(--admin-error)' : 'var(--admin-border)'}`,
              borderRadius: 10,
              padding: '14px 16px',
              fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--admin-text)',
              outline: 'none',
              marginBottom: error ? 8 : 12,
            }}
          />

          {error && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-error)', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: !loading ? 'var(--admin-btn-primary-bg)' : 'var(--admin-btn)',
              color: !loading ? 'var(--admin-btn-primary-fg)' : 'var(--admin-muted)',
              border: 'none', borderRadius: 10,
              padding: '14px',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
              cursor: !loading ? 'pointer' : 'default',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
