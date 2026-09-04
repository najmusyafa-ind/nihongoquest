'use client';

// src/components/AiExplainer.tsx — AI Sensei grammar explanation panel
// States: idle → loading (skeleton) → content → error
// Calls AiExplainerService via API route (server-side, keeps API key safe)

import { useState } from 'react';
import { Sparkles, Zap, RotateCcw } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import type { Flashcard } from '@/types/entities';

interface AiExplainerProps {
  card: Flashcard;
}

type AiState = 'idle' | 'loading' | 'content' | 'error';

export function AiExplainer({ card }: AiExplainerProps) {
  const { lang, t } = useLangStore();
  const [state, setState] = useState<AiState>('idle');
  const [explanation, setExplanation] = useState<string>('');
  const [isCached, setIsCached] = useState(false);

  const handleAskAI = async () => {
    setState('loading');
    setExplanation('');
    setIsCached(false);

    try {
      const startTime = Date.now();
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: card.kanji ?? card.hiragana,
          hiragana: card.hiragana,
          lang,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json() as { explanation: string; cached: boolean };
      const duration = Date.now() - startTime;

      setExplanation(data.explanation);
      setIsCached(data.cached || duration < 300);
      setState('content');
    } catch {
      // GAP-7 FIX: UI already shows error state via setState('error').
      // console.error removed per rules.md Rule 10 (use toast/logger, not console).
      setState('error');
    }
  };

  if (state === 'idle') {
    return (
      <button
        id="ask-ai-btn"
        onClick={handleAskAI}
        className="btn-ghost"
        style={{ alignSelf: 'flex-start', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <Sparkles className="icon-sm" aria-hidden="true" />
        {t('study.askAI')}
      </button>
    );
  }

  return (
    <div
      id="ai-explainer-panel"
      style={{
        borderLeft: '2px solid var(--color-primary)',
        paddingLeft: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-primary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Sparkles className="icon-xs" aria-hidden="true" />
          AI Sensei
        </span>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isCached && state === 'content' && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-muted)',
                padding: '2px 6px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Zap className="icon-xs" aria-hidden="true" />
              cached
            </span>
          )}
          {state === 'content' && (
            <button
              onClick={handleAskAI}
              aria-label="Refresh AI explanation"
              style={{
                fontSize: '11px',
                color: 'var(--color-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '4px',
                transition: 'color 0.12s ease',
              }}
            >
              <RotateCcw className="icon-sm" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {state === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '14px', width: '90%' }} />
          <div className="skeleton" style={{ height: '14px', width: '75%' }} />
          <div className="skeleton" style={{ height: '14px', width: '85%' }} />
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            {t('study.aiExplaining')}
          </p>
        </div>
      )}

      {state === 'content' && (
        <p
          style={{
            fontSize: '14px',
            lineHeight: '1.7',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {explanation}
        </p>
      )}

      {state === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-destructive)' }}>
            {t('study.aiError')}
          </p>
          <button
            id="ai-retry-btn"
            onClick={handleAskAI}
            className="btn-ghost"
            style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '6px 12px', minHeight: '32px' }}
          >
            {t('common.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
