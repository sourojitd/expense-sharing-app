'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Receipt,
  UserPlus,
  Activity,
  RefreshCw,
  Settings,
  HandCoins,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SplitLogo } from '@/components/ui/SplitLogo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/friends', label: 'Friends', icon: UserPlus },
  { href: '/settle', label: 'Settle Up', icon: HandCoins },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-card/50 backdrop-blur-sm transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b">
        <SplitLogo size={34} />
        {!collapsed && <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Splito</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'sidebar-link-active text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive && 'text-primary')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
