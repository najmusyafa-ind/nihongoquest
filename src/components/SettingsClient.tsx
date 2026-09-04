'use client';

// src/components/SettingsClient.tsx — Fully functional user preferences
// Sections: Language, Study Preferences (cards/type/levels), Appearance (theme), Account, Danger Zone

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { toast } from 'sonner';
import {
  Globe,
  BookOpen,
  Palette,
  LogOut,
  User,
  Trash2,
  Settings,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { useStudyStore } from '@/store/studyStore';
import { useThemeStore, type ThemePreference } from '@/store/themeStore';
import {
  useSettingsStore,
  CARDS_PER_SESSION_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  type CardsPerSession,
  type QuestionType,
} from '@/store/settingsStore';
import { LangSwitcher } from './LangSwitcher';
import { JLPT_LEVELS, type JlptLevel } from '@/types/enums';

// ── Shared sub-components ──────────────────────────────────────────────────────

interface SettingsSectionProps {
  icon: React.FC<{ size?: number; 'aria-hidden'?: boolean }>;
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, children }: SettingsSectionProps) {
  return (
    <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} aria-hidden={true} />
        </div>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  label, description, children,
}: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>{label}</p>
        {description && (
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.5 }}>{description}</p>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Pill Selector ──────────────────────────────────────────────────────────────

function PillSelector<T extends string | number>({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  getLabel?: (v: T) => string;
}) {
  return (
    <div style={{
      display: 'flex', gap: '4px',
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px', padding: '3px',
    }}>
      {options.map((opt) => {
        const isActive = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              transition: 'background 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s ease, box-shadow 0.15s ease',
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? '#fff' : 'var(--color-muted)',
              boxShadow: isActive ? 'var(--shadow-primary)' : 'none',
            }}
          >
            {getLabel ? getLabel(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

// ── Theme Toggle (3-way) ───────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemePreference; labelEn: string; labelJa: string; Icon: typeof Sun }[] = [
  { value: 'light',  labelEn: 'Light',  labelJa: 'ライト', Icon: Sun     },
  { value: 'dark',   labelEn: 'Dark',   labelJa: 'ダーク', Icon: Moon    },
  { value: 'system', labelEn: 'System', labelJa: 'システム', Icon: Monitor },
];

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const { lang } = useLangStore();

  return (
    <div style={{
      display: 'flex', gap: '4px',
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px', padding: '3px',
    }}>
      {THEME_OPTIONS.map(({ value, labelEn, labelJa, Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            id={`theme-btn-${value}`}
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            title={lang === 'ja' ? labelJa : labelEn}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px',
              borderRadius: '6px', border: 'none',
              fontSize: '12px', fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              transition: 'background 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s ease, box-shadow 0.15s ease',
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? '#fff' : 'var(--color-muted)',
              boxShadow: isActive ? 'var(--shadow-primary)' : 'none',
              minWidth: '44px', minHeight: '32px',
            }}
          >
            <Icon size={13} aria-hidden />
            <span>{lang === 'ja' ? labelJa : labelEn}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Level Toggle ───────────────────────────────────────────────────────────────

const AVAILABLE_LEVELS: JlptLevel[] = ['N5', 'N4']; // N3-N1 coming soon

function LevelToggle() {
  const { activeLevels, toggleLevel } = useSettingsStore();
  const { lang } = useLangStore();

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {JLPT_LEVELS.map((level) => {
        const isAvailable = AVAILABLE_LEVELS.includes(level);
        const isActive = activeLevels.includes(level);
        return (
          <button
            key={level}
            type="button"
            onClick={() => isAvailable && toggleLevel(level)}
            disabled={!isAvailable}
            title={!isAvailable ? (lang === 'ja' ? '近日公開' : 'Coming soon') : undefined}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px', fontWeight: 700,
              fontFamily: 'var(--font-ui)',
              letterSpacing: '0.05em',
              border: `1px solid ${isActive && isAvailable ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: isActive && isAvailable ? 'var(--color-accent-soft)' : 'var(--color-surface-raised)',
              color: isActive && isAvailable ? 'var(--color-accent-dark)' : 'var(--color-muted)',
              cursor: isAvailable ? 'pointer' : 'not-allowed',
              opacity: isAvailable ? 1 : 0.45,
              transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              minWidth: '38px', minHeight: '32px',
            }}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SettingsClient() {
  const { lang, t } = useLangStore();
  const { pendingSessions } = useStudyStore();
  const { cardsPerSession, setCardsPerSession, questionType, setQuestionType } = useSettingsStore();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const header = root.querySelector('.settings-header');
      const sections = root.querySelectorAll('.settings-section-anim');

      if (header) gsap.fromTo(header, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      if (sections.length > 0) {
        gsap.fromTo(
          Array.from(sections),
          { opacity: 0, y: 20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power2.out', stagger: 0.07, delay: 0.1 }
        );
      }
    },
    { scope: containerRef }
  );

  const handleSignOut = async () => {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success(lang === 'ja' ? 'サインアウトしました。' : 'Signed out successfully.');
      router.push('/');
      router.refresh();
    } catch (err) {
      void err;
      toast.error(t('common.error'));
    }
  };

  const handleClearLocalData = () => {
    if (pendingSessions.length > 0) {
      toast.error(
        lang === 'ja'
          ? `${pendingSessions.length}件の未同期データがあります。先に同期してください。`
          : `You have ${pendingSessions.length} unsynced session(s). Please sync first.`
      );
      return;
    }
    useStudyStore.getState().clearCache();
    toast.success(lang === 'ja' ? 'ローカルデータを削除しました。' : 'Local cache cleared.');
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div className="settings-header" style={{ marginBottom: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
          <span className="badge-pill">
            <Settings size={10} aria-hidden style={{ marginRight: '4px' }} />
            {lang === 'ja' ? '設定' : 'Settings'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
          {t('nav.settings')}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {lang === 'ja' ? 'アプリの設定と環境設定を管理します。' : 'Manage your app preferences and account.'}
        </p>
      </div>

      {/* ── Language ── */}
      <div className="settings-section-anim">
        <SettingsSection icon={Globe} title={lang === 'ja' ? '言語' : 'Language'}>
          <SettingRow
            label={lang === 'ja' ? 'インターフェース言語' : 'Interface Language'}
            description={lang === 'ja' ? 'UIの表示言語を切り替えます。' : 'Switch the display language for the UI.'}
          >
            <LangSwitcher />
          </SettingRow>
        </SettingsSection>
      </div>

      {/* ── Study Preferences ── */}
      <div className="settings-section-anim">
        <SettingsSection icon={BookOpen} title={lang === 'ja' ? '学習設定' : 'Study Preferences'}>

          {/* Cards per Session */}
          <SettingRow
            label={lang === 'ja' ? '1セッションあたりのカード数' : 'Cards per Session'}
            description={lang === 'ja' ? '各セッションで学習するカードの枚数を選択。' : 'Choose how many cards to study each session.'}
          >
            <PillSelector<CardsPerSession>
              options={CARDS_PER_SESSION_OPTIONS}
              value={cardsPerSession}
              onChange={setCardsPerSession}
              getLabel={(v) => String(v)}
            />
          </SettingRow>

          {/* Question Type */}
          <SettingRow
            label={lang === 'ja' ? '問題タイプ' : 'Question Type'}
            description={lang === 'ja' ? 'フラッシュカード、JLPTクイズ、またはミックス。' : 'Flashcard typing, JLPT multiple-choice, or both.'}
          >
            <PillSelector<QuestionType>
              options={QUESTION_TYPE_OPTIONS.map((o) => o.value)}
              value={questionType}
              onChange={setQuestionType}
              getLabel={(v) => {
                const opt = QUESTION_TYPE_OPTIONS.find((o) => o.value === v);
                return lang === 'ja' ? (opt?.labelJa ?? v) : (opt?.labelEn ?? v);
              }}
            />
          </SettingRow>

          {/* Active Levels */}
          <SettingRow
            label={lang === 'ja' ? 'アクティブなレベル' : 'Active Levels'}
            description={lang === 'ja' ? '学習するJLPTレベルを選択。N3以上は近日公開。' : 'Choose which JLPT levels to study. N3+ coming soon.'}
          >
            <LevelToggle />
          </SettingRow>
        </SettingsSection>
      </div>

      {/* ── Appearance ── */}
      <div className="settings-section-anim">
        <SettingsSection icon={Palette} title={lang === 'ja' ? '外観' : 'Appearance'}>
          <SettingRow
            label={lang === 'ja' ? 'テーマ' : 'Theme'}
            description={lang === 'ja' ? 'ライト・ダーク・またはシステム設定に従う。' : 'Light, Dark, or follow your device system setting.'}
          >
            <ThemeToggle />
          </SettingRow>
        </SettingsSection>
      </div>

      {/* ── Account ── */}
      <div className="settings-section-anim">
        <SettingsSection icon={User} title={lang === 'ja' ? 'アカウント' : 'Account'}>
          <SettingRow
            label={lang === 'ja' ? 'サインアウト' : 'Sign Out'}
            description={lang === 'ja' ? 'すべてのデバイスでセッションを終了します。' : 'End your session on this device.'}
          >
            <button
              id="settings-signout-btn"
              onClick={() => { void handleSignOut(); }}
              className="btn-ghost"
              style={{ fontSize: '13px', padding: '7px 14px', minHeight: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} aria-hidden />
              {t('auth.signOut')}
            </button>
          </SettingRow>
        </SettingsSection>
      </div>

      {/* ── Danger Zone ── */}
      <div className="settings-section-anim">
        <SettingsSection icon={Trash2} title={lang === 'ja' ? '危険な操作' : 'Danger Zone'}>
          <SettingRow
            label={lang === 'ja' ? 'ローカルキャッシュを削除' : 'Clear Local Cache'}
            description={lang === 'ja' ? 'オフラインのフラッシュカードデータを削除します。' : 'Remove offline flashcard data from this device.'}
          >
            <button
              id="settings-clear-cache-btn"
              onClick={handleClearLocalData}
              className="btn-ghost"
              style={{
                fontSize: '13px', padding: '7px 14px', minHeight: '36px',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: 'var(--color-destructive)',
                border: '1px solid var(--color-destructive-border)',
              }}
            >
              <Trash2 size={14} aria-hidden />
              {lang === 'ja' ? '削除' : 'Clear'}
            </button>
          </SettingRow>
          <p style={{
            fontSize: '12px', color: 'var(--color-muted)',
            padding: '8px 12px',
            background: 'var(--color-surface-raised)',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
          }}>
            {lang === 'ja'
              ? '学習履歴はサーバーに追記専用で保存されています。削除・変更は不可能です。'
              : 'Study history is stored append-only on the server. It cannot be deleted or modified.'}
          </p>
        </SettingsSection>
      </div>
    </div>
  );
}
