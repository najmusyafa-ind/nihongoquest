// src/app/(main)/session/loading.tsx
// Skeleton matching FlashCard: card + progress bar + action buttons

export default function SessionLoading() {
  return (
    <div className="loading-session" aria-busy="true" aria-label="Loading session...">
      <div className="lses-progress skeleton-pulse" />
      <div className="lses-card skeleton-pulse" />
      <div className="lses-actions">
        {[0, 1].map((i) => (
          <div key={i} className="lses-btn skeleton-pulse" />
        ))}
      </div>
      <style>{`
        .loading-session { padding: var(--space-6); display: flex; flex-direction: column; align-items: center; gap: var(--space-6); max-width: 600px; margin: 0 auto; }
        .lses-progress { height: 8px; width: 100%; border-radius: var(--radius-full); }
        .lses-card { width: 100%; height: 320px; border-radius: var(--radius-lg); }
        .lses-actions { display: flex; gap: var(--space-4); width: 100%; }
        .lses-btn { flex: 1; height: 52px; border-radius: var(--radius-md); }
        .skeleton-pulse {
          background: linear-gradient(90deg, var(--color-surface) 25%, color-mix(in srgb, var(--color-surface) 80%, var(--color-muted)) 50%, var(--color-surface) 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}
