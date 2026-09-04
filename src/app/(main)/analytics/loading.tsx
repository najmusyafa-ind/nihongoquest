// src/app/(main)/analytics/loading.tsx
export default function AnalyticsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ width: '65px', height: '20px', borderRadius: '99px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '180px', height: '28px', borderRadius: '6px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: '90px', borderRadius: '12px', background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.08}s` }} />
        ))}
      </div>
      <div style={{ height: '200px', borderRadius: '12px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.2s' }} />
      <div style={{ height: '160px', borderRadius: '12px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.25s' }} />
    </div>
  );
}
