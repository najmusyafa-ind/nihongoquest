// src/lib/motivational-toasts.ts
// Duolingo-style motivational notifications triggered after study events.
//
// Design rules:
//   - Server calculates streak → passes to client → client calls triggerStudyToast()
//   - Bilingual: EN/JA based on current lang store value
//   - Uses Sonner toast.success() / toast.info() — never alert()
//   - Every toast has an emoji + concise message (max ~60 chars)
//   - No duplicate toasts in same session (deduped by event type)

import { toast } from 'sonner';

// ── Event types ───────────────────────────────────────────────────────────────
export type StudyEvent =
  | { type: 'session_complete'; accuracy: number; cardsStudied: number; streakDays: number }
  | { type: 'first_word_today' }
  | { type: 'streak'; days: number }
  | { type: 'high_accuracy'; accuracy: number }
  | { type: 'level_unlocked'; level: string }
  | { type: 'quiz_complete'; score: number; total: number };

// ── Deduplication — prevent same toast type firing twice per page load ────────
const firedThisSession = new Set<string>();

// ── Message bank ──────────────────────────────────────────────────────────────
const MESSAGES = {
  session_complete: {
    en: (acc: number) =>
      acc >= 90
        ? '🏆 Perfect session! Keep it up!'
        : acc >= 70
        ? '🎉 Session complete! Great work!'
        : '✅ Session done! Practice makes perfect.',
    ja: (acc: number) =>
      acc >= 90
        ? '🏆 完璧なセッション！続けよう！'
        : acc >= 70
        ? '🎉 セッション完了！よくできました！'
        : '✅ セッション終了！継続は力なり。',
  },
  first_word_today: {
    en: '🌱 First words of the day! Great start!',
    ja: '🌱 今日の最初の学習！いいスタートだ！',
  },
  streak: {
    en: (days: number) =>
      days >= 30
        ? `🔥 ${days}-day streak! You're unstoppable!`
        : days >= 7
        ? `⚡ ${days}-day streak! Week Warrior!`
        : days >= 3
        ? `🔥 ${days}-day streak! Keep the momentum!`
        : `🌱 ${days}-day streak started! Don't break it!`,
    ja: (days: number) =>
      days >= 30
        ? `🔥 ${days}日連続！止まらないぞ！`
        : days >= 7
        ? `⚡ ${days}日連続！週間戦士だ！`
        : days >= 3
        ? `🔥 ${days}日連続！勢いを保とう！`
        : `🌱 ${days}日連続スタート！途切らせないで！`,
  },
  high_accuracy: {
    en: (acc: number) => `🧠 ${acc}% accuracy — Sharp Mind!`,
    ja: (acc: number) => `🧠 正解率${acc}％ — シャープマインド！`,
  },
  low_accuracy: {
    en: '💪 Keep practicing — you\'ll get there!',
    ja: '💪 練習を続けよう！必ず上達する！',
  },
  level_unlocked: {
    en: (level: string) => `🚀 ${level} unlocked! Ready for the next level?`,
    ja: (level: string) => `🚀 ${level}解禁！次のレベルへ挑戦！`,
  },
  quiz_complete: {
    en: (score: number, total: number) =>
      score === total
        ? `🏆 Perfect quiz! ${score}/${total}`
        : score >= total * 0.8
        ? `🎯 Great quiz! ${score}/${total}`
        : `📝 Quiz done: ${score}/${total}. Keep studying!`,
    ja: (score: number, total: number) =>
      score === total
        ? `🏆 完璧！${score}/${total}`
        : score >= total * 0.8
        ? `🎯 よくできた！${score}/${total}`
        : `📝 クイズ終了：${score}/${total}。もっと練習しよう！`,
  },
} as const;

// ── Main function ─────────────────────────────────────────────────────────────
export function triggerStudyToast(event: StudyEvent, lang: 'en' | 'ja' = 'en'): void {
  const key = event.type + ('days' in event ? event.days : '');

  // Dedup: don't fire the same event type twice per session
  if (firedThisSession.has(key)) return;
  firedThisSession.add(key);

  switch (event.type) {
    case 'session_complete': {
      const msg =
        lang === 'ja'
          ? MESSAGES.session_complete.ja(event.accuracy)
          : MESSAGES.session_complete.en(event.accuracy);
      toast.success(msg, { duration: 4000 });

      // Low accuracy follow-up after 1s
      if (event.accuracy < 50 && !firedThisSession.has('low_accuracy')) {
        firedThisSession.add('low_accuracy');
        setTimeout(() => {
          toast.info(lang === 'ja' ? MESSAGES.low_accuracy.ja : MESSAGES.low_accuracy.en, {
            duration: 4000,
          });
        }, 1200);
      }
      break;
    }

    case 'first_word_today': {
      toast.info(lang === 'ja' ? MESSAGES.first_word_today.ja : MESSAGES.first_word_today.en, {
        duration: 3500,
      });
      break;
    }

    case 'streak': {
      // Only show streak toast for meaningful milestones
      if (event.days < 1) break;
      const msg =
        lang === 'ja' ? MESSAGES.streak.ja(event.days) : MESSAGES.streak.en(event.days);
      // Streak 7+ gets a more prominent toast
      if (event.days >= 7) {
        toast.success(msg, { duration: 5000 });
      } else {
        toast.info(msg, { duration: 4000 });
      }
      break;
    }

    case 'high_accuracy': {
      if (event.accuracy < 90) break; // Only toast if truly high
      const msg =
        lang === 'ja'
          ? MESSAGES.high_accuracy.ja(event.accuracy)
          : MESSAGES.high_accuracy.en(event.accuracy);
      toast.success(msg, { duration: 4000 });
      break;
    }

    case 'level_unlocked': {
      const msg =
        lang === 'ja'
          ? MESSAGES.level_unlocked.ja(event.level)
          : MESSAGES.level_unlocked.en(event.level);
      toast.success(msg, { duration: 5000 });
      break;
    }

    case 'quiz_complete': {
      const msg =
        lang === 'ja'
          ? MESSAGES.quiz_complete.ja(event.score, event.total)
          : MESSAGES.quiz_complete.en(event.score, event.total);
      const pct = (event.score / event.total) * 100;
      if (pct >= 80) {
        toast.success(msg, { duration: 4000 });
      } else {
        toast.info(msg, { duration: 4000 });
      }
      break;
    }
  }
}

// ── Helper: calculate and fire all relevant toasts after session save ─────────
// Call this AFTER the POST /api/sessions returns successfully.
export function triggerPostSessionToasts(params: {
  streakDays: number;
  accuracy: number;       // 0–100
  cardsStudied: number;
  isFirstToday: boolean;
  lang: 'en' | 'ja';
}): void {
  const { streakDays, accuracy, cardsStudied, isFirstToday, lang } = params;

  // 1. First word of the day
  if (isFirstToday) {
    triggerStudyToast({ type: 'first_word_today' }, lang);
  }

  // 2. Session complete (with accuracy context)
  setTimeout(() => {
    triggerStudyToast(
      { type: 'session_complete', accuracy, cardsStudied, streakDays },
      lang
    );
  }, isFirstToday ? 800 : 0);

  // 3. Streak milestone (fires after session_complete)
  if (streakDays >= 2) {
    setTimeout(() => {
      triggerStudyToast({ type: 'streak', days: streakDays }, lang);
    }, isFirstToday ? 1800 : 1000);
  }

  // 4. High accuracy bonus (fires last)
  if (accuracy >= 90) {
    setTimeout(() => {
      triggerStudyToast({ type: 'high_accuracy', accuracy }, lang);
    }, isFirstToday ? 2800 : 2000);
  }
}
