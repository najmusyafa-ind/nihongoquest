# Error Monitoring — Sentry Setup Guide

NihongoQuest menggunakan **Sentry** untuk error monitoring production.
Sentry sudah terintegrasi penuh di kode — yang dibutuhkan hanya env var DSN.

---

## Setup (5 menit)

### 1. Buat Sentry Project

1. Buka https://sentry.io → Sign Up (gratis, 5.000 errors/bulan)
2. Create Project → pilih platform: **Next.js**
3. Nama project: `nihongoquest`

### 2. Ambil DSN

- Pergi ke: **Settings → Projects → nihongoquest → Client Keys (DSN)**
- Copy DSN-nya (format: `https://xxxxxx@o0.ingest.sentry.io/yyyyyyy`)

### 3. Buat Auth Token

- Pergi ke: **User Settings → Auth Tokens → Create New Token**
- Scopes yang dibutuhkan: `project:releases`, `org:read`
- Copy token-nya (format: `sntrys_xxxxxxxx`)

### 4. Tambah ke .env.local

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/your-id
SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/your-id
SENTRY_AUTH_TOKEN=sntrys_your-token
```

### 5. Tambah ke Vercel

Vercel Dashboard → Settings → Environment Variables → tambah ketiga variable di atas.

---

## Yang Sudah Terintegrasi (Zero Config)

| File | Fungsi |
|------|--------|
| `sentry.client.config.ts` | Error capture di browser, Session Replay (5% sessions) |
| `sentry.server.config.ts` | Error capture di Node.js runtime (API routes) |
| `sentry.edge.config.ts` | Error capture di Edge runtime (middleware) |
| `src/instrumentation.ts` | Auto-register Sentry on server startup |

## PII Scrubbing (GDPR-Safe)

Sentry dikonfigurasi untuk **TIDAK mengirim data pribadi user**:
- `userAnswer` (jawaban belajar user) → di-strip sebelum dikirim ke Sentry
- `email`, `token`, `apiKey` → sudah di-redact oleh logger.ts
- Session Replay: `maskAllText: true`, `blockAllMedia: true`
- User object: hanya `id` anonim yang dikirim, bukan email/nama

## Verifikasi Setup

Setelah menambah env vars, test dengan membuat error manual:

```bash
# Di browser console (halaman manapun di app):
throw new Error("Sentry test — NihongoQuest")
```

Cek Sentry dashboard dalam 30 detik — event harus muncul.
