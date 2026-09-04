import type { Metadata } from 'next';
import { VocabularyClient } from '@/components/VocabularyClient';

export const metadata: Metadata = {
  title: 'Vocabulary | NihongoQuest',
  description: 'Browse and search Japanese vocabulary by JLPT level.',
};

export default function VocabularyPage() {
  return <VocabularyClient />;
}
