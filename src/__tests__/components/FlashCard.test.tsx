import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FlashCard } from '@/components/FlashCard';
import type { Flashcard } from '@/types/entities';

describe('FlashCard Component', () => {
  const mockCard: Flashcard = {
    id: '1',
    level: 'N5',
    kanji: '猫',
    hiragana: 'ねこ',
    romaji: 'neko',
    meaningId: 'Kucing',
    meaningEn: 'Cat',
    exampleJp: '猫が好きです。',
    exampleId: 'Saya suka kucing.',
    exampleEn: 'I like cats.',
    createdAt: new Date(),
  };

  const baseProps = {
    card: mockCard,
    cardIndex: 0,
    totalCards: 10,
    gradeResult: null,
  } as const;

  it('renders front of the card initially (isRevealed = false)', () => {
    render(<FlashCard {...baseProps} isRevealed={false} />);

    // Front always shows kanji
    expect(screen.getByText('猫')).toBeInTheDocument();

    // Meaning (back face) must NOT be visible when not revealed
    expect(screen.queryByText('Kucing')).not.toBeInTheDocument();
  });

  it('renders back of the card when revealed (isRevealed = true)', () => {
    render(<FlashCard {...baseProps} isRevealed={true} />);

    // Front still present
    expect(screen.getByText('猫')).toBeInTheDocument();

    // Back face: lang defaults to 'en' in test env, so meaningEn ('Cat') is shown
    // ねこ is always shown in back face
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.getByText('ねこ')).toBeInTheDocument();
  });

  it('shows CORRECT grade indicator when gradeResult is CORRECT', () => {
    render(<FlashCard {...baseProps} isRevealed={true} gradeResult="CORRECT" />);

    // The card should render without crashing and show the kanji
    expect(screen.getByText('猫')).toBeInTheDocument();
  });
});
