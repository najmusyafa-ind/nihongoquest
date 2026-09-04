// src/app/(main)/quiz/loading.tsx
export default function QuizLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ width: '50px', height: '20px', borderRadius: '99px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '200px', height: '28px', borderRadius: '6px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '260px', height: '16px', borderRadius: '4px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.1s' }} />
      </div>
      <div style={{ height: '160px', borderRadius: '12px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.15s' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: '60px', borderRadius: '10px', background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.06}s` }} />
        ))}
      </div>
    </div>
  );
}
