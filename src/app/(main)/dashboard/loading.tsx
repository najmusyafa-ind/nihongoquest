// src/app/(main)/dashboard/loading.tsx
// Skeleton matching DashboardClient layout: header + 3 stat cards + chart area

export default function DashboardLoading() {
  return (
    <div className="loading-dashboard" aria-busy="true" aria-label="Loading dashboard...">
      <div className="loading-header-bar skeleton-pulse" />
      <div className="loading-stats-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="loading-stat-card skeleton-pulse" />
        ))}
      </div>
      <div className="loading-chart skeleton-pulse" />
      <style>{`
        .loading-dashboard { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-6); }
        .loading-header-bar { height: 32px; border-radius: var(--radius-md); width: 200px; }
        .loading-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
        .loading-stat-card { height: 120px; border-radius: var(--radius-lg); }
        .loading-chart { height: 280px; border-radius: var(--radius-lg); }
        .skeleton-pulse {
          background: linear-gradient(90deg, var(--color-surface) 25%, color-mix(in srgb, var(--color-surface) 80%, var(--color-muted)) 50%, var(--color-surface) 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 640px) { .loading-stats-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
