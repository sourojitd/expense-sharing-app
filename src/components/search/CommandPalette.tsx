'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Users,
  HandCoins,
  UserPlus,
  LayoutDashboard,
  Activity,
  RefreshCw,
  Settings,
  PlusCircle,
  Search,
  Keyboard,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts?: () => void;
}

export function CommandPalette({ open, onOpenChange, onShowShortcuts }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Small delay to avoid visual flicker while the dialog is closing
      const timeout = setTimeout(() => setSearch(''), 150);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No results found.</p>
            <p className="text-xs text-muted-foreground/60">
              Try searching for expenses, groups, or actions.
            </p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/expenses/new'))}
            keywords={['add', 'create', 'new', 'expense']}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Add Expense</span>
            <CommandShortcut>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span className="text-xs">Ctrl</span>N
              </kbd>
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/groups/new'))}
            keywords={['create', 'new', 'group']}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Create Group</span>
            <CommandShortcut>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span className="text-xs">Ctrl</span>G
              </kbd>
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/settle'))}
            keywords={['settle', 'pay', 'payment', 'debt']}
          >
            <HandCoins className="mr-2 h-4 w-4" />
            <span>Settle Up</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/friends'))}
            keywords={['add', 'friend', 'invite', 'contact']}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Add Friend</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard'))}
            keywords={['home', 'overview', 'summary']}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/groups'))}
            keywords={['teams', 'shared']}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Groups</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/expenses'))}
            keywords={['bills', 'transactions', 'spending']}
          >
            <Receipt className="mr-2 h-4 w-4" />
            <span>Expenses</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/friends'))}
            keywords={['contacts', 'people']}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Friends</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/activity'))}
            keywords={['log', 'history', 'recent']}
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>Activity</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/recurring'))}
            keywords={['repeat', 'subscription', 'scheduled']}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Recurring Expenses</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/settings'))}
            keywords={['preferences', 'account', 'profile']}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Help */}
        <CommandGroup heading="Help">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                onShowShortcuts?.();
              })
            }
            keywords={['help', 'shortcuts', 'keys', 'hotkeys']}
          >
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ?
              </kbd>
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
