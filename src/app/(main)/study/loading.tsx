// src/app/(main)/study/loading.tsx
// Skeleton matching DeckSelectorClient: title + 5 level cards

export default function StudyLoading() {
  return (
    <div className="loading-study" aria-busy="true" aria-label="Loading study page...">
      <div className="ls-title skeleton-pulse" />
      <div className="ls-subtitle skeleton-pulse" />
      <div className="ls-grid">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="ls-card skeleton-pulse" />
        ))}
      </div>
      <style>{`
        .loading-study { padding: var(--space-8) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6); max-width: 800px; margin: 0 auto; }
        .ls-title { height: 40px; width: 60%; border-radius: var(--radius-md); }
        .ls-subtitle { height: 20px; width: 40%; border-radius: var(--radius-sm); }
        .ls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); }
        .ls-card { height: 160px; border-radius: var(--radius-lg); }
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
