// src/app/(main)/page.tsx — Home "/" — Deck selector

import type { Metadata } from 'next';
import { DeckSelectorClient } from '@/components/DeckSelectorClient';

export const metadata: Metadata = {
  title: 'Study | NihongoQuest',
  description: 'Choose your JLPT level and start a Japanese flashcard session.',
};

export default function HomePage() {
  return <DeckSelectorClient />;
}
