'use client';

// src/components/VocabularyClient.tsx — Japanese vocabulary browser
// Search + filter by JLPT level, card view with kanji/reading/meaning

import { useRef, useState, useCallback, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Search, BookText, X, ChevronRight, AlertCircle, RefreshCw, Volume2, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Flashcard } from '@/types/entities';
import type { JlptLevel } from '@/types/enums';

// ── Async State ───────────────────────────────────────────────────────────────────
type VocabFetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'idle' };   // data is held in vocab state separately for append

const AVAILABLE_FILTER_LEVELS: JlptLevel[] = ['N5', 'N4'];

export function VocabularyClient() {
  const { lang } = useLangStore();
  const { activeLevels } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery]                   = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterLevel, setFilterLevel]       = useState<JlptLevel | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [expanded, setExpanded]             = useState<string | null>(null);
  const [vocab, setVocab]                   = useState<Flashcard[]>([]);
  const [totalWords, setTotalWords]         = useState<number>(0);
  const [cursor, setCursor]                 = useState<string | null>(null);
  const [hasMore, setHasMore]               = useState(false);
  const [fetchState, setFetchState]         = useState<VocabFetchState>({ status: 'loading' });
  // Voice state: tracks which card id is currently being spoken
  const [speakingId, setSpeakingId]         = useState<string | null>(null);

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── Fetch from /api/vocabulary ─────────────────────────────────────────────
  const fetchVocab = useCallback(async (opts: { replace: boolean; cursorToken?: string }) => {
    if (opts.replace) {
      setCursor(null);
      setVocab([]);
    }
    setFetchState({ status: 'loading' });
    try {
      const level = filterLevel !== 'ALL' ? filterLevel : (activeLevels[0] ?? 'N5');
      const params = new URLSearchParams({ level, limit: '30' });
      if (debouncedQuery)                        params.set('q', debouncedQuery);
      if (opts.cursorToken)                      params.set('cursor', opts.cursorToken);
      if (filterCategory !== 'ALL')              params.set('category', filterCategory);
      const res = await fetch(`/api/vocabulary?${params.toString()}`);
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof body === 'object' && body !== null && 'error' in body
            ? String((body as { error: { message?: string } }).error?.message ?? res.statusText)
            : res.statusText;
        setFetchState({ status: 'error', message: msg });
        return;
      }
      const data: { cards: Flashcard[]; nextCursor: string | null; total?: number } = await res.json();
      setVocab((prev) => opts.replace ? data.cards : [...prev, ...data.cards]);
      setTotalWords(data.total ?? 0);
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
      setFetchState({ status: 'idle' });
    } catch (err) {
      setFetchState({ status: 'error', message: err instanceof Error ? err.message : 'Network error' });
    }
  }, [filterLevel, filterCategory, activeLevels, debouncedQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchVocab is async; setState fires inside its async body, not synchronously in this effect
    void fetchVocab({ replace: true });
  }, [fetchVocab]);

  // Filtering is now server-side — API returns already-filtered results
  // Only apply client-side level filter for display-level badge matching
  const filtered = vocab.filter((v) => {
    const matchLevel = filterLevel === 'ALL' ? activeLevels.includes(v.level) : v.level === filterLevel;
    return matchLevel;
  });

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const header = root.querySelector('.vocab-header');
      const toolbar = root.querySelector('.vocab-toolbar');
      if (header) gsap.fromTo(header, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      if (toolbar) gsap.fromTo(toolbar, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', delay: 0.1 });
    },
    { scope: containerRef }
  );

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  }, []);

  // ── Web Speech API — Japanese TTS ────────────────────────────────────────────
  const handleSpeak = useCallback((e: React.MouseEvent, card: Flashcard) => {
    e.stopPropagation(); // don't toggle expand
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Cancel any ongoing utterance first
    window.speechSynthesis.cancel();

    if (speakingId === card.id) {
      // Second click = stop
      setSpeakingId(null);
      return;
    }

    const text = card.kanji ?? card.hiragana;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;  // slightly slower = clearer for learners
    utterance.pitch = 1;

    setSpeakingId(card.id);
    utterance.onend   = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
  }, [speakingId]);

  const levelColor: Record<JlptLevel, string> = {
    N5: 'var(--color-success)', N4: 'var(--color-accent)',
    N3: 'var(--color-accent-dark)', N2: 'var(--color-primary)', N1: 'var(--color-text-secondary)',
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div className="vocab-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
          <span className="badge-pill">
            <BookText size={10} aria-hidden style={{ marginRight: '4px' }} />
            {lang === 'ja' ? '単語帳' : 'Vocabulary'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
          {lang === 'ja' ? '単語ブラウザー' : 'Vocabulary Browser'}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {lang === 'ja' ? 'JLPT単語をレベルで検索できます' : `Browse and search ${totalWords > 0 ? totalWords : vocab.length} Japanese vocabulary words`}
        </p>
      </div>

      {/* JLPT Info Banner */}
      <div className="bento-tile" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '0.875rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px',
            background: 'rgba(21,128,61,0.12)', color: 'var(--color-success)',
            border: '1px solid rgba(21,128,61,0.3)', fontFamily: 'var(--font-mono)',
          }}>N5</span>
          <p style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>
            {lang === 'ja' ? '目標: 800単語' : 'Target: 800 words'}
          </p>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            · {lang === 'ja' ? `現在: ${vocab.length}語` : `Loaded: ${vocab.length} words`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '160px', flex: 1 }}>
          <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.round((vocab.length / 800) * 100))}%`,
              background: 'linear-gradient(90deg, var(--color-success) 0%, var(--color-accent) 100%)',
              borderRadius: '3px',
              transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} />
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
            {Math.min(100, Math.round((vocab.length / 800) * 100))}%
          </span>
        </div>
      </div>

      {/* Search + Filter toolbar */}
      <div className="vocab-toolbar bento-tile" style={{ padding: '1rem', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} aria-hidden style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', flexShrink: 0 }} />
          <input
            id="vocab-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'ja' ? '漢字・ひらがな・ローマ字・意味で検索...' : 'Search kanji, hiragana, romaji, meaning...'}
            aria-label="Search vocabulary"
            style={{
              width: '100%', padding: '9px 36px 9px 36px',
              borderRadius: '8px', border: '1px solid var(--color-border)',
              background: 'var(--color-surface-raised)', fontSize: '14px',
              color: 'var(--color-text)', outline: 'none',
              fontFamily: 'var(--font-ui)',
              transition: 'border-color 0.15s ease',
            }}
          />
          {query && (
            <button
              type="button" onClick={() => setQuery('')}
              aria-label="Clear search"
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Level filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['ALL', ...AVAILABLE_FILTER_LEVELS] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilterLevel(lvl)}
              style={{
                padding: '7px 12px', borderRadius: '7px',
                fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                background: filterLevel === lvl ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                color: filterLevel === lvl ? '#fff' : 'var(--color-muted)',
                border: `1px solid ${filterLevel === lvl ? 'var(--color-primary)' : 'var(--color-border)'}`,
                transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                minHeight: '36px',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} {lang === 'ja' ? '件' : 'words'}
        </span>
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
          {lang === 'ja' ? '品詞' : 'Category'}:
        </span>
        {([
          { key: 'ALL',       labelEn: 'All',       labelJa: 'すべて' },
          { key: 'verb',      labelEn: 'Verbs',     labelJa: '動詞' },
          { key: 'noun',      labelEn: 'Nouns',     labelJa: '名詞' },
          { key: 'adjective', labelEn: 'Adjectives', labelJa: '形容詞' },
          { key: 'adverb',    labelEn: 'Adverbs',   labelJa: '副詞' },
        ] as const).map(({ key, labelEn, labelJa }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterCategory(key)}
            style={{
              padding: '5px 12px', borderRadius: '999px',
              fontSize: '12px', fontWeight: 600,
              fontFamily: 'var(--font-ui)', cursor: 'pointer',
              background: filterCategory === key ? 'var(--color-accent)' : 'var(--color-surface-raised)',
              color: filterCategory === key ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${filterCategory === key ? 'var(--color-accent)' : 'var(--color-border)'}`,
              transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              minHeight: '32px',
            }}
          >
            {lang === 'ja' ? labelJa : labelEn}
          </button>
        ))}
      </div>

      {/* Vocabulary grid */}
      {filtered.length === 0 ? (
        <div className="bento-tile" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px', fontFamily: 'var(--font-jp)' }}>見つかりません</p>
          <p style={{ fontSize: '14px' }}>{lang === 'ja' ? '検索結果がありません。' : 'No words found. Try a different search.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map((card) => {
            const isOpen = expanded === card.id;
            return (
              <div
                key={card.id}
                className="bento-tile"
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
                  boxShadow: isOpen ? 'var(--shadow-primary)' : 'var(--shadow-tile)',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onClick={() => handleToggle(card.id)}
                role="button"
                aria-expanded={isOpen}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleToggle(card.id)}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    {card.kanji && (
                      <p style={{ fontFamily: 'var(--font-jp)', fontSize: '28px', fontWeight: 700, color: 'var(--color-kanji)', lineHeight: 1.1, marginBottom: '2px' }}>
                        {card.kanji}
                      </p>
                    )}
                    <p style={{ fontFamily: 'var(--font-jp)', fontSize: card.kanji ? '14px' : '24px', color: 'var(--color-kanji-reading)', fontWeight: card.kanji ? 400 : 600 }}>
                      {card.hiragana}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      {card.romaji}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                      background: `rgba(0,0,0,0.06)`, color: levelColor[card.level],
                      border: `1px solid ${levelColor[card.level]}30`,
                      letterSpacing: '0.06em',
                    }}>
                      {card.level}
                    </span>
                    <ChevronRight
                      size={14}
                      aria-hidden
                      style={{
                        color: 'var(--color-muted)',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Meaning */}
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                  {lang === 'ja' ? card.meaningId : `${card.meaningId} / ${card.meaningEn}`}
                </p>

                {/* Expanded: example sentence */}
                {/* Expanded content — always shown when isOpen, regardless of exampleJp */}
                {isOpen && (
                  <div
                    style={{
                      marginTop: '12px', paddingTop: '12px',
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex', flexDirection: 'column', gap: '12px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Grammar type badge + pronunciation row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Category badge */}
                      {(card as Flashcard & { category?: string }).category && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                          background: 'var(--color-accent-bg, rgba(245,166,35,0.12))',
                          color: 'var(--color-accent)',
                          border: '1px solid var(--color-accent)',
                          letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>
                          {(card as Flashcard & { category?: string }).category}
                        </span>
                      )}
                      {/* Bilingual meaning */}
                      <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                        {lang === 'ja' ? card.meaningId : `${card.meaningId} · ${card.meaningEn}`}
                      </span>
                    </div>

                    {/* Pronunciation guide — clickable TTS button */}
                    <button
                      type="button"
                      onClick={(e) => handleSpeak(e, card)}
                      aria-label={speakingId === card.id ? 'Stop pronunciation' : `Listen to pronunciation of ${card.hiragana}`}
                      aria-pressed={speakingId === card.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '8px', width: '100%',
                        background: speakingId === card.id
                          ? 'var(--color-primary-muted, rgba(233,69,96,0.08))'
                          : 'var(--color-surface-raised)',
                        border: `1px solid ${speakingId === card.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      {speakingId === card.id
                        ? <Loader2 size={14} aria-hidden style={{ color: 'var(--color-primary)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                        : <Volume2 size={14} aria-hidden style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'var(--font-jp)', fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>
                          {card.hiragana}
                        </p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                          {card.romaji} · {speakingId === card.id ? (lang === 'ja' ? '再生中...' : 'Playing...') : (lang === 'ja' ? 'タップして再生' : 'Tap to listen')}
                        </p>
                      </div>
                    </button>

                    {/* Example sentence */}
                    {card.exampleJp ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {lang === 'ja' ? '例文' : 'Example'}
                        </p>
                        <p style={{ fontFamily: 'var(--font-jp)', fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6 }}>
                          {card.exampleJp}
                        </p>
                        {lang !== 'ja' && card.exampleId && (
                          <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                            {card.exampleId}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 10px', borderRadius: '6px',
                        background: 'var(--color-surface-raised)',
                      }}>
                        <BookOpen size={12} aria-hidden style={{ color: 'var(--color-muted)' }} />
                        <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                          {lang === 'ja' ? '例文はまだありません' : 'No example sentence yet'}
                        </p>
                      </div>
                    )}

                    {/* Study CTA */}
                    <a
                      href={`/session?level=${card.level}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '8px', width: 'fit-content',
                        background: 'var(--color-primary)', color: '#fff',
                        fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-ui)',
                        textDecoration: 'none',
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
                      aria-label={`Study ${card.level} level`}
                    >
                      <ArrowRight size={12} aria-hidden />
                      {lang === 'ja' ? `${card.level}を練習する` : `Practice ${card.level}`}
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error banner */}
      {fetchState.status === 'error' && (
        <div
          role="alert"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'var(--color-destructive-bg)', border: '1px solid var(--color-destructive-border)' }}
        >
          <AlertCircle size={14} aria-hidden style={{ color: 'var(--color-destructive)', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'var(--color-destructive)', fontWeight: 500, flex: 1 }}>{fetchState.message}</p>
          <button
            onClick={() => void fetchVocab({ replace: true })}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-destructive)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
          >
            <RefreshCw size={12} aria-hidden />
            {lang === 'ja' ? '再試行' : 'Retry'}
          </button>
        </div>
      )}

      {/* Loading skeleton — shown while paginating (items already in list) */}
      {fetchState.status === 'loading' && vocab.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: '80px', borderRadius: '12px', background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.08}s` }} />
          ))}
        </div>
      )}

      {/* Initial loading skeleton — no items yet */}
      {fetchState.status === 'loading' && vocab.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '120px', borderRadius: '12px', background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.05}s` }} />
          ))}
        </div>
      )}

      {/* Load More button */}
      {hasMore && fetchState.status !== 'loading' && (
        <button
          onClick={() => void fetchVocab({ replace: false, cursorToken: cursor ?? undefined })}
          className="btn-secondary"
          style={{ width: '100%', padding: '11px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          {lang === 'ja' ? 'もっと読み込む' : 'Load more'}
        </button>
      )}
    </div>
  );
}
