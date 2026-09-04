'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
interface ErrorProps { error: Error & { digest?: string }; reset: () => void; }
export default function AchievementsError({ error, reset }: ErrorProps) {
  useEffect(() => { console.error('[AchievementsError boundary]', error.message); }, [error]);
  return (
    <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '3rem 2rem', textAlign: 'center', minHeight: '300px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--color-destructive-bg)', border: '1px solid var(--color-destructive-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle size={24} aria-hidden style={{ color: 'var(--color-destructive)' }} />
      </div>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>Failed to load achievements</h2>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '320px' }}>{error.message || 'Something went wrong. Please try again.'}</p>
        {error.digest && <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>Error ID: {error.digest}</p>}
      </div>
      <button onClick={reset} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}>
        <RefreshCw size={14} aria-hidden />Try again
      </button>
    </div>
  );
}
