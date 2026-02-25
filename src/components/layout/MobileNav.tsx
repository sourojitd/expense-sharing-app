'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Plus,
  UserPlus,
  Menu,
  Settings,
  Receipt,
  Activity,
  RefreshCw,
  HandCoins,
  LayoutDashboard,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Separator } from '@/components/ui/separator';

const menuNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/friends', label: 'Friends', icon: UserPlus },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/settle', label: 'Settle Up', icon: HandCoins },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNavContent() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 h-16 border-b">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <Wallet className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg tracking-tight">Splito</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Home tab */}
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg min-w-[56px]',
            'transition-all duration-150 active:scale-90',
            isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Groups tab */}
        <Link
          href="/groups"
          className={cn(
            'flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg min-w-[56px]',
            'transition-all duration-150 active:scale-90',
            isActive('/groups') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium">Groups</span>
        </Link>

        {/* Center floating Add button */}
        <div className="relative flex flex-col items-center justify-center min-w-[56px]">
          <Link
            href="/expenses/new"
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground -mt-5 shadow-lg shadow-primary/30',
              'transition-all duration-150 active:scale-90 hover:shadow-xl hover:shadow-primary/40 hover:brightness-110'
            )}
          >
            <Plus className="h-6 w-6" />
          </Link>
          <span className={cn(
            'text-[10px] font-medium mt-0.5',
            isActive('/expenses/new') ? 'text-primary' : 'text-muted-foreground'
          )}>Add</span>
        </div>

        {/* Friends tab */}
        <Link
          href="/friends"
          className={cn(
            'flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg min-w-[56px]',
            'transition-all duration-150 active:scale-90',
            isActive('/friends') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <UserPlus className="h-5 w-5" />
          <span className="text-[10px] font-medium">Friends</span>
        </Link>

        {/* Menu tab - opens Sheet */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg min-w-[56px]',
                'transition-all duration-150 active:scale-90',
                menuOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-[300px] flex flex-col">
            <SheetHeader className="px-4 pt-4 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <SheetTitle className="text-lg font-bold tracking-tight">Splito</SheetTitle>
                </div>
              </div>
            </SheetHeader>

            <Separator className="mt-4" />

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {menuNavItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>

            <Separator />

            {/* Bottom section: theme toggle */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
