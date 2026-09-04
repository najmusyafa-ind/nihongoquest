// src/app/(main)/layout.tsx — Main app layout with nav header
// Wraps all authenticated pages: /, /session, /dashboard

import { StudyLayoutShell } from '@/components/StudyLayoutShell';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <StudyLayoutShell>{children}</StudyLayoutShell>;
}
