import type { Metadata } from 'next';
import { QuizClient } from '@/components/QuizClient';

export const metadata: Metadata = {
  title: 'JLPT Quiz | NihongoQuest',
  description: 'Practice with JLPT-style multiple choice questions from N5 and N4 vocabulary.',
};

export default function QuizPage() {
  return <QuizClient />;
}
