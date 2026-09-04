// src/app/(main)/session/page.tsx — Active study session at /session

import type { Metadata } from 'next';
import { SessionClient } from '@/components/SessionClient';

export const metadata: Metadata = {
  title: 'Study Session | NihongoQuest',
};

export default function SessionPage() {
  return <SessionClient />;
}
