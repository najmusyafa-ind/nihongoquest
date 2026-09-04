import type { Metadata } from 'next';
import { AnalyticsClient } from '@/components/AnalyticsClient';

export const metadata: Metadata = {
  title: 'Analytics | NihongoQuest',
  description: 'Track your Japanese study progress, accuracy, and streaks.',
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
