# NihongoQuest — Error Monitoring Setup (Sentry)

> **Important #4 dari Pre-Production Checklist**
> Dokumen ini menjelaskan cara setup Sentry untuk monitoring production errors.

## Kenapa Sentry?

Tanpa error monitoring, kamu **buta** terhadap production crashes. Sentry akan:
- Notifikasi real-time saat user encounter error
- Capture stack trace + request context
- Track error frequency dan impacted users

## Langkah Setup (15 menit)

### 1. Install Package

```bash
npm install @sentry/nextjs
```

### 2. Jalankan Wizard (Otomatis)

```bash
npx @sentry/wizard@latest -i nextjs
```

Wizard akan:
- Login/daftar Sentry.io
- Buat project baru
- Generate `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Tambah env vars ke `.env.local`

### 3. Env Vars yang Dibutuhkan

Tambahkan ke `.env.local` dan hosting (Vercel/Railway):

```bash
SENTRY_DSN=https://xxxxxxxx@o0.ingest.sentry.io/xxxxxxxx
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxx  # Untuk source maps upload
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxx@o0.ingest.sentry.io/xxxxxxxx
```

Tambahkan ke `.env.example`:
```bash
# Error Monitoring (Sentry)
SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/your-project-id
SENTRY_AUTH_TOKEN=sntrys_your-auth-token
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/your-project-id
```

### 4. Konfigurasi yang Direkomendasikan

Setelah wizard, edit `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Capture 10% of transactions in production (cost control)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Replay 1% of sessions, 10% of error sessions
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.1,
  
  // Don't capture errors in development
  enabled: process.env.NODE_ENV === 'production',
  
  // Filter noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
  ],
  
  integrations: [
    Sentry.replayIntegration(),
  ],
});
```

### 5. Tambahkan ke `next.config.ts`

Wrap config dengan `withSentryConfig`:

```typescript
import { withSentryConfig } from '@sentry/nextjs';

// ... existing nextConfig ...

export default withSentryConfig(nextConfig, {
  org: 'your-sentry-org',
  project: 'nihongoquest',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,  // Don't expose source maps to users
  disableLogger: true,
  automaticVercelMonitors: true,
});
```

## Alternatif Gratis: Axiom

Jika tidak ingin Sentry (gratis tier terbatas), gunakan **Axiom**:

```bash
npm install next-axiom
```

Axiom memberikan logging terstruktur tanpa biaya untuk volume kecil.
Docs: https://axiom.co/docs/guides/nextjs

## Vercel Built-in (Paling Simple)

Jika deploy ke **Vercel**, aktifkan **Vercel Speed Insights** dan **Vercel Analytics** gratis:

```bash
npm install @vercel/analytics @vercel/speed-insights
```

Tambahkan ke `src/app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Di dalam RootLayout return:
<>
  {children}
  <Analytics />
  <SpeedInsights />
</>
```

Ini memberikan:
- Page view tracking
- Core Web Vitals (LCP, CLS, FID)
- Error tracking (basic)

Tanpa perlu akun Sentry atau env var tambahan — otomatis aktif di Vercel dashboard.
