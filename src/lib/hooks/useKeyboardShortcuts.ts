'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutOptions {
  onCommandK?: () => void;
  onQuestionMark?: () => void;
}

export function useKeyboardShortcuts(options?: KeyboardShortcutOptions) {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow Escape in inputs (handled by Radix dialogs), but block other shortcuts
      if (isTyping && e.key !== 'Escape') {
        // Still allow Cmd+K even when typing, so users can open the palette from search fields
        const isMod = e.metaKey || e.ctrlKey;
        if (!(isMod && e.key === 'k')) {
          return;
        }
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+K / Ctrl+K: Open command palette
      if (isMod && e.key === 'k') {
        e.preventDefault();
        options?.onCommandK?.();
        return;
      }

      // Cmd+N / Ctrl+N: New expense
      if (isMod && e.key === 'n') {
        e.preventDefault();
        router.push('/expenses/new');
        return;
      }

      // Cmd+G / Ctrl+G: New group
      if (isMod && e.key === 'g') {
        e.preventDefault();
        router.push('/groups/new');
        return;
      }

      // ? key: Show keyboard shortcuts dialog
      // On most keyboards, ? is produced by Shift+/, so e.key will be '?'
      if (e.key === '?' && !isMod) {
        e.preventDefault();
        options?.onQuestionMark?.();
        return;
      }
    },
    [router, options]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
