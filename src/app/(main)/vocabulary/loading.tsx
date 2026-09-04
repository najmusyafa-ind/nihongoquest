// src/app/(main)/vocabulary/loading.tsx
// Streaming loading UI for /vocabulary route
// Shown by Next.js App Router while VocabularyClient + data fetch is resolving

export default function VocabularyLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ width: '60px', height: '20px', borderRadius: '99px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '220px', height: '28px', borderRadius: '6px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '180px', height: '16px', borderRadius: '4px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.1s' }} />
      </div>

      {/* Search bar skeleton */}
      <div style={{ height: '44px', borderRadius: '10px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.15s' }} />

      {/* Card grid skeleton — 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: '120px', borderRadius: '12px',
              background: 'var(--color-border)',
              animation: `pulse 1.5s ease-in-out infinite ${i * 0.05}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
