'use client';

import { useCallback, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileNav';
import { CommandPalette } from '@/components/search/CommandPalette';
import { KeyboardShortcutsDialog } from '@/components/shortcuts/KeyboardShortcutsDialog';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const handleOpenCommandPalette = useCallback(() => {
    setCommandPaletteOpen((prev) => !prev);
  }, []);

  const handleOpenShortcuts = useCallback(() => {
    setShortcutsDialogOpen(true);
  }, []);

  useKeyboardShortcuts({
    onCommandK: handleOpenCommandPalette,
    onQuestionMark: handleOpenShortcuts,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <TopBar onSearchClick={handleOpenCommandPalette} />
        <main className="flex-1 px-4 py-4 md:px-10 md:py-8 pb-20 md:pb-8">{children}</main>
      </div>
      <MobileBottomNav />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onShowShortcuts={() => {
          setCommandPaletteOpen(false);
          // Small delay so the command palette closes before shortcuts dialog opens
          setTimeout(() => setShortcutsDialogOpen(true), 150);
        }}
      />
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </div>
  );
}
