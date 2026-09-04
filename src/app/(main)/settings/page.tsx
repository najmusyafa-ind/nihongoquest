// src/app/(main)/settings/page.tsx — Settings page at /settings

import type { Metadata } from 'next';
import { SettingsClient } from '@/components/SettingsClient';

export const metadata: Metadata = {
  title: 'Settings | NihongoQuest',
  description: 'Manage your NihongoQuest preferences, language, and account settings.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
