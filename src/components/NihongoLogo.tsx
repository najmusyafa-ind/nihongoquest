// src/components/NihongoLogo.tsx — Scalable SVG logo component
// Usage:
//   <NihongoLogo />                    → full logo (icon + wordmark)
//   <NihongoLogo variant="icon" />     → icon only (navbar, favicon fallback)
//   <NihongoLogo variant="wordmark" /> → text only
//   <NihongoLogo size="sm" />          → 28px icon
//   <NihongoLogo size="lg" />          → 52px icon

interface NihongoLogoProps {
  /** 'full' = icon + wordmark | 'icon' = icon only | 'wordmark' = text only */
  variant?: 'full' | 'icon' | 'wordmark';
  /** sm=28, md=36, lg=52, xl=72 — controls icon height */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = { sm: 28, md: 36, lg: 52, xl: 72 } as const;

/**
 * Torii gate SVG — clean, readable at all sizes.
 * Uses the brand vermilion from CSS token --color-primary.
 * Purely code-generated; no external image files, no AI content.
 */
function ToriiIcon({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Badge background */}
      <rect width="72" height="72" rx="16" fill="var(--color-primary)" />

      {/* ── Torii gate (鳥居) ── */}
      {/* Kasagi — top curved crossbeam */}
      <rect x="9" y="18" width="54" height="9" rx="4.5" fill="white" />
      {/* Nuki — second crossbeam */}
      <rect x="15" y="31" width="42" height="6" rx="3" fill="white" opacity="0.80" />
      {/* Left pillar (hashira) */}
      <rect x="15" y="30" width="9" height="28" rx="4.5" fill="white" />
      {/* Right pillar (hashira) */}
      <rect x="48" y="30" width="9" height="28" rx="4.5" fill="white" />
    </svg>
  );
}

function WordMark({ px }: { px: number }) {
  const mainSize = Math.round(px * 0.5);   // e.g. sm=14px, md=18px
  const subSize  = Math.round(px * 0.25);  // e.g. sm=7px,  md=9px

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, lineHeight: 1 }}>
      <span
        style={{
          fontFamily: 'var(--font-jp, sans-serif)',
          fontSize: `${mainSize}px`,
          fontWeight: 700,
          color: 'var(--color-text)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        Nihongo
        <span style={{ color: 'var(--color-primary)' }}>Quest</span>
      </span>
      <span
        style={{
          fontFamily: 'var(--font-jp, sans-serif)',
          fontSize: `${subSize}px`,
          fontWeight: 400,
          color: 'var(--color-muted)',
          letterSpacing: '0.07em',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
        }}
      >
        日本語クエスト
      </span>
    </div>
  );
}

export function NihongoLogo({
  variant = 'full',
  size = 'md',
  className,
}: NihongoLogoProps) {
  const px = SIZES[size];

  if (variant === 'icon') {
    return (
      <span
        className={className}
        role="img"
        aria-label="NihongoQuest"
        style={{ display: 'inline-flex', lineHeight: 0 }}
      >
        <ToriiIcon px={px} />
      </span>
    );
  }

  if (variant === 'wordmark') {
    return (
      <span
        className={className}
        role="img"
        aria-label="NihongoQuest"
        style={{ display: 'inline-flex' }}
      >
        <WordMark px={px} />
      </span>
    );
  }

  // variant === 'full'
  return (
    <span
      className={className}
      role="img"
      aria-label="NihongoQuest — 日本語クエスト"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.round(px * 0.35)}px`,
      }}
    >
      <ToriiIcon px={px} />
      <WordMark px={px} />
    </span>
  );
}
