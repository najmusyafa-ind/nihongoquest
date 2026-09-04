// src/app/(main)/achievements/loading.tsx
export default function AchievementsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ width: '80px', height: '20px', borderRadius: '99px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '200px', height: '28px', borderRadius: '6px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: '130px', borderRadius: '12px', background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.05}s` }} />
        ))}
      </div>
    </div>
  );
}
