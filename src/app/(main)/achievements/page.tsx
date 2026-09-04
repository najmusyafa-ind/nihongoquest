import type { Metadata } from 'next';
import { AchievementsClient } from '@/components/AchievementsClient';

export const metadata: Metadata = {
  title: 'Achievements | NihongoQuest',
  description: 'Track your milestones and earn badges for your Japanese study progress.',
};

export default function AchievementsPage() {
  return <AchievementsClient />;
}
