import { LandingClient } from '@/components/LandingClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NihongoQuest | Master Japanese',
  description: 'Learn Japanese through smart flashcards and AI-powered grammar explanations.',
};

export default function LandingPage() {
  return <LandingClient />;
}
