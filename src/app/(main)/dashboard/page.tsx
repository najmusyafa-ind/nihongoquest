// src/app/(main)/dashboard/page.tsx — Progress dashboard at /dashboard

import type { Metadata } from 'next';
import { DashboardClient } from '@/components/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard | NihongoQuest',
  description: 'Track your Japanese language learning progress.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
