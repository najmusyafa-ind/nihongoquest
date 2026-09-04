'use client';

// src/components/SyncIndicator.tsx — Online/Offline/Syncing status indicator
// Always visible in study mode navigation bar
// Rule 9 compliant: uses useLangStore().t() for i18n labels

import { useEffect } from 'react';
import { useStudyStore } from '@/store/studyStore';
import { useLangStore } from '@/store/langStore';

export function SyncIndicator() {
  const { isOnline, isSyncing, setOnline } = useStudyStore();
  const { t } = useLangStore();

  useEffect(() => {
    function handleOnline() {
      setOnline(true); // setOnline triggers syncToServer() automatically
    }
    function handleOffline() {
      setOnline(false);
    }

    // Set initial state on mount
    setOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  let label: string;
  let dotClass: string;

  if (isSyncing) {
    label = t('sync.syncing');
    dotClass = 'sync-dot sync-dot--syncing';
  } else if (isOnline) {
    label = t('sync.online');
    dotClass = 'sync-dot sync-dot--online';
  } else {
    label = t('sync.offline');
    dotClass = 'sync-dot sync-dot--offline';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        backgroundColor: 'var(--color-surface)',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-ui)',
        transition: 'color 0.2s ease',
      }}
    >
      <span className={dotClass} />
      {label}
    </div>
  );
}
