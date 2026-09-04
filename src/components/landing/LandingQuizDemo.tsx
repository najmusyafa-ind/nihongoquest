'use client';

// src/components/landing/LandingQuizDemo.tsx
// F-3 split: JLPT sample quiz section extracted from LandingClient.tsx (was 872 lines)
// All quiz logic, data, and GSAP animations isolated here.
// Rule 6 compliant: all GSAP via useGSAP() + contextSafe()

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { KeyRound, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useLangStore } from '@/store/langStore';

/* ─────────────────────────────────────────────────────────────────────────────
   JLPT Sample Quiz Data — Migii-inspired (N5 → N1)
   3 questions per level | Vocabulary + Grammar + Kanji Reading
   ───────────────────────────────────────────────────────────────────────────── */
type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

interface QuizQuestion {
  id: number;
  type: 'Vocabulary' | 'Grammar' | 'Kanji';
  jp: string;
  reading?: string;
  question: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
}

const QUIZ_DATA: Record<JlptLevel, QuizQuestion[]> = {
  N5: [
    {
      id: 1, type: 'Vocabulary', jp: '食べる', reading: 'たべる',
      question: 'What does 食べる (たべる) mean?',
      options: ['to drink', 'to eat', 'to sleep', 'to read'], answerIndex: 1,
    },
    {
      id: 2, type: 'Grammar', jp: '私は学生___。', reading: 'わたしはがくせい___。',
      question: 'Choose the correct particle to complete: 私は学生___。',
      options: ['が', 'を', 'に', 'です'], answerIndex: 3,
    },
    {
      id: 3, type: 'Kanji', jp: '水', reading: '',
      question: 'What is the reading of 水?',
      options: ['ひ (hi)', 'みず (mizu)', 'き (ki)', 'つち (tsuchi)'], answerIndex: 1,
    },
  ],
  N4: [
    {
      id: 1, type: 'Vocabulary', jp: '遅刻する', reading: 'ちこくする',
      question: 'What does 遅刻する (ちこくする) mean?',
      options: ['to arrive early', 'to be late', 'to cancel', 'to hurry'], answerIndex: 1,
    },
    {
      id: 2, type: 'Grammar', jp: '雨が降った___、試合は中止になった。', reading: 'あめがふった___、しあいはちゅうしになった。',
      question: 'Choose the correct conjunction:',
      options: ['ので', 'から', 'ため', 'けれど'], answerIndex: 0,
    },
    {
      id: 3, type: 'Kanji', jp: '図書館', reading: '',
      question: 'What is the reading of 図書館?',
      options: ['びじゅつかん', 'としょかん', 'はくぶつかん', 'ゆうびんきょく'], answerIndex: 1,
    },
  ],
  N3: [
    {
      id: 1, type: 'Vocabulary', jp: '我慢する', reading: 'がまんする',
      question: 'What does 我慢する (がまんする) mean?',
      options: ['to be surprised', 'to endure / put up with', 'to regret', 'to compete'], answerIndex: 1,
    },
    {
      id: 2, type: 'Grammar', jp: '彼は病気___、学校へ行った。', reading: 'かれはびょうき___、がっこうへいった。',
      question: 'Choose the expression that shows contrast (despite being sick):',
      options: ['だから', 'なのに', 'ために', 'ながら'], answerIndex: 1,
    },
    {
      id: 3, type: 'Kanji', jp: '複雑', reading: '',
      question: 'What is the reading of 複雑?',
      options: ['ふくざつ', 'ふくさつ', 'ぶくざつ', 'ほくざつ'], answerIndex: 0,
    },
  ],
  N2: [
    {
      id: 1, type: 'Vocabulary', jp: '皮肉', reading: 'ひにく',
      question: 'What does 皮肉 (ひにく) mean?',
      options: ['sincerity', 'irony / sarcasm', 'curiosity', 'perseverance'], answerIndex: 1,
    },
    {
      id: 2, type: 'Grammar', jp: 'その件については、担当者___お問い合わせください。', reading: '',
      question: 'Choose the correct formal expression:',
      options: ['まで', 'にて', 'まで', 'にわたり'], answerIndex: 0,
    },
    {
      id: 3, type: 'Kanji', jp: '曖昧', reading: '',
      question: 'What is the reading of 曖昧?',
      options: ['あいまい', 'えんまい', 'あまい', 'おうまい'], answerIndex: 0,
    },
  ],
  N1: [
    {
      id: 1, type: 'Vocabulary', jp: '諦観', reading: 'ていかん',
      question: 'What does 諦観 (ていかん) mean?',
      options: ['enthusiasm for achievement', 'resigned acceptance of reality', 'strict discipline', 'deep admiration'],
      answerIndex: 1,
    },
    {
      id: 2, type: 'Grammar', jp: '彼の発言は、場の空気を読んでいない___言いようがない。', reading: '',
      question: 'Which expression best completes the criticism?',
      options: ['というより', 'としか', 'どころか', 'にほかならず'], answerIndex: 1,
    },
    {
      id: 3, type: 'Kanji', jp: '齟齬', reading: '',
      question: 'What is the reading of 齟齬?',
      options: ['しゅご', 'そご', 'しょご', 'ぞご'], answerIndex: 1,
    },
  ],
};

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function LandingQuizDemo() {
  const [activeLevel, setActiveLevel] = useState<JlptLevel>('N5');
  const [revealed, setRevealed] = useState(false);
  const { t } = useLangStore();
  const quizRef = useRef<HTMLDivElement>(null);
  const answerKeyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: quizRef });

  /* eslint-disable react-hooks/refs */
  const handleTabChange = contextSafe((level: JlptLevel) => {
    if (level === activeLevel) return;
    const cards = listRef.current?.querySelectorAll('.quiz-question-card');
    if (cards && cards.length > 0) {
      gsap.to(Array.from(cards), {
        opacity: 0, y: -8, duration: 0.15, ease: 'power2.in',
        onComplete: () => { setActiveLevel(level); setRevealed(false); },
      });
    } else {
      setActiveLevel(level);
      setRevealed(false);
    }
  });

  const handleReveal = contextSafe(() => {
    if (revealed) return;
    const panel = answerKeyRef.current;
    if (!panel) return;
    setRevealed(true);
    gsap.fromTo(panel, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.45, ease: 'power3.out' });
  });
  /* eslint-enable react-hooks/refs */

  // Re-animate cards after level change
  useGSAP(
    () => {
      const cards = listRef.current?.querySelectorAll('.quiz-question-card');
      if (!cards || cards.length === 0) return;
      gsap.fromTo(
        Array.from(cards),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.08 }
      );
    },
    { scope: quizRef, dependencies: [activeLevel] }
  );

  const questions = QUIZ_DATA[activeLevel];

  return (
    <div ref={quizRef} className="section-landing__quiz">
      <div className="section-landing__quiz-inner">
        {/* Header */}
        <div className="section-landing__quiz-header">
          <div className="section-landing__quiz-eyebrow">
            <KeyRound style={{ width: 12, height: 12 }} />
            {t('landing.quizEyebrow')}
          </div>
          <h2 className="section-landing__quiz-title">{t('landing.quizTitle')}</h2>
          <p className="section-landing__quiz-subtitle">{t('landing.quizSubtitle')}</p>
        </div>

        {/* Level Tabs */}
        <div className="section-landing__quiz-tabs" role="tablist" aria-label="JLPT Level">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              id={`quiz-tab-${lvl}`}
              role="tab"
              aria-selected={activeLevel === lvl}
              aria-controls={`quiz-panel-${lvl}`}
              className={`quiz-tab${activeLevel === lvl ? ' quiz-tab--active' : ''}`}
              onClick={() => handleTabChange(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Questions */}
        <div
          ref={listRef}
          id={`quiz-panel-${activeLevel}`}
          role="tabpanel"
          aria-labelledby={`quiz-tab-${activeLevel}`}
          className="section-landing__quiz-list"
        >
          {questions.map((q, idx) => (
            <div key={`${activeLevel}-${q.id}`} className="quiz-question-card">
              <div className="quiz-question-card__header">
                <span className="quiz-question-card__num">{idx + 1}</span>
                <span className="quiz-question-card__type">{q.type}</span>
                <span className="badge-level" style={{ marginLeft: 'auto' }}>{activeLevel}</span>
              </div>
              {q.jp && <span className="quiz-question-card__jp" lang="ja">{q.jp}</span>}
              {q.reading && <span className="quiz-question-card__reading" lang="ja">{q.reading}</span>}
              <p className="quiz-question-card__text">{q.question}</p>
              <div className="quiz-options">
                {q.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className={`quiz-option${revealed && optIdx === q.answerIndex ? ' quiz-option--correct' : ''}`}
                  >
                    <span className="quiz-option__letter">{OPTION_LETTERS[optIdx]}</span>
                    <span className="quiz-option__text">{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Reveal Button */}
        <div className="section-landing__quiz-reveal">
          {!revealed ? (
            <button className="quiz-reveal-btn" onClick={handleReveal} aria-expanded={false} aria-controls="quiz-answer-key">
              <ChevronDown style={{ width: 18, height: 18 }} />
              {t('landing.quizReveal')}
            </button>
          ) : (
            <button className="quiz-reveal-btn" disabled aria-expanded={true} style={{ opacity: 0.55, cursor: 'default' }}>
              {t('landing.quizRevealed')}
            </button>
          )}
        </div>

        {/* Answer Key Panel */}
        <div
          ref={answerKeyRef}
          id="quiz-answer-key"
          className="quiz-answer-key"
          style={{ height: revealed ? 'auto' : 0, opacity: revealed ? 1 : 0 }}
          aria-hidden={!revealed}
        >
          <div className="quiz-answer-key__inner">
            <p className="quiz-answer-key__title">{t('landing.quizAnswerKey')} — {activeLevel}</p>
            <div className="quiz-answer-key__grid">
              {questions.map((q, idx) => (
                <div key={q.id} className="quiz-answer-key__item">
                  <span className="quiz-answer-key__item-num">{t('landing.quizQuestion')} {idx + 1}</span>
                  <span className="quiz-answer-key__item-answer">
                    {OPTION_LETTERS[q.answerIndex]} — {q.options[q.answerIndex]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="section-landing__quiz-cta">
          <p>{t('landing.quizMoreCta')}</p>
          <Link href="/auth/register" className="btn-primary" style={{ textDecoration: 'none' }}>
            {t('landing.quizStartFree')}
          </Link>
        </div>
      </div>
    </div>
  );
}
