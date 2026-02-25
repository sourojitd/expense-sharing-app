'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { useApi } from '@/lib/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  PlusCircle,
  Users,
  ArrowLeftRight,
  UserPlus,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowRight,
  Receipt,
  HandCoins,
} from 'lucide-react';
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  getGreeting,
  getInitials,
} from '@/lib/utils';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types matching the /api/dashboard/summary response
// ---------------------------------------------------------------------------

interface BalanceEntry {
  userId: string;
  userName: string;
  amount: number;
  currency: string;
}

interface BalanceSummary {
  totalOwed: number;
  totalOwe: number;
  netBalance: number;
  currency: string;
  balances: BalanceEntry[];
}

interface RecentExpense {
  id: string;
  description: string;
  amount: number | string;
  currency: string;
  date: string;
  category: string | null;
  payer: { id: string; name: string };
  group: { id: string; name: string } | null;
}

interface GroupMember {
  user: { id: string; name: string };
}

interface RecentGroup {
  id: string;
  name: string;
  description: string | null;
  members: GroupMember[];
  _count: { members: number; expenses: number };
}

interface DashboardResponse {
  user: { id: string; name: string; email: string; preferredCurrency: string };
  balanceSummary: BalanceSummary;
  recentExpenses: RecentExpense[];
  recentGroups: RecentGroup[];
}

// ---------------------------------------------------------------------------
// Quick action definitions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  { href: '/expenses/new', label: 'Add Expense', icon: PlusCircle },
  { href: '/groups/new', label: 'New Group', icon: Users },
  { href: '/settle', label: 'Settle Up', icon: ArrowLeftRight },
  { href: '/friends', label: 'Add Friends', icon: UserPlus },
] as const;

// ---------------------------------------------------------------------------
// Small sub-components (kept in the same file as requested)
// ---------------------------------------------------------------------------

function BalanceCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-3 w-36" />
      </CardContent>
    </Card>
  );
}

function ExpenseRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

function GroupCardSkeleton() {
  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-6 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();
  const { get } = useApi();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const res = await get<DashboardResponse>('/api/dashboard/summary');
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  }, [get]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const currency = data?.balanceSummary?.currency ?? user?.preferredCurrency ?? 'USD';

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Greeting Section                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s your financial snapshot
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Actions                                                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="group cursor-pointer border-dashed hover:border-primary/50 hover:bg-accent/50 transition-all">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Balance Summary Cards                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading ? (
          <>
            <BalanceCardSkeleton />
            <BalanceCardSkeleton />
            <BalanceCardSkeleton />
          </>
        ) : (
          <>
            {/* You Owe */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You Owe
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(data?.balanceSummary?.totalOwe ?? 0, currency)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total across all groups
                </p>
              </CardContent>
            </Card>

            {/* You're Owed */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You&apos;re Owed
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(data?.balanceSummary?.totalOwed ?? 0, currency)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total across all groups
                </p>
              </CardContent>
            </Card>

            {/* Net Balance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Balance
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    (data?.balanceSummary?.netBalance ?? 0) >= 0
                      ? 'text-success'
                      : 'text-destructive'
                  )}
                >
                  {formatCurrency(data?.balanceSummary?.netBalance ?? 0, currency)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(data?.balanceSummary?.netBalance ?? 0) >= 0
                    ? 'You are in the green'
                    : 'You owe more than you are owed'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Recent Expenses & Balances Overview                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Expenses</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href="/expenses">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
                  <ExpenseRowSkeleton key={i} />
                ))}
              </div>
            ) : !data?.recentExpenses?.length ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium">No expenses yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start tracking by adding your first expense
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/expenses/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {data.recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center justify-between gap-4 py-3 rounded-lg transition-colors hover:bg-accent/50 -mx-2 px-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                        {expense.description.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {expense.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>Paid by {expense.payer?.name ?? 'Unknown'}</span>
                          <span>&middot;</span>
                          <span>{formatRelativeTime(expense.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {expense.category && (
                        <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                          {expense.category}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(Number(expense.amount), expense.currency)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balances Overview - Who Owes What */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Who Owes What</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href="/settle">
                Settle Up
                <HandCoins className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="divide-y">
                {[1, 2, 3, 4].map((i) => (
                  <BalanceRowSkeleton key={i} />
                ))}
              </div>
            ) : !data?.balanceSummary?.balances?.length ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium">All settled up!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You have no outstanding balances
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {data.balanceSummary.balances.map((entry) => {
                  const owesYou = entry.amount > 0;
                  return (
                    <div
                      key={entry.userId}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(entry.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{entry.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {owesYou ? 'owes you' : 'you owe'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            owesYou ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {owesYou ? '+' : '-'}
                          {formatCurrency(Math.abs(entry.amount), entry.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          asChild
                        >
                          <Link href="/settle">Settle</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Your Groups                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your Groups</h2>
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link href="/groups">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </div>
        ) : !data?.recentGroups?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium">No groups yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a group to start splitting expenses with friends
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/groups/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create a Group
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="group cursor-pointer hover:border-primary/30 hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold transition-transform group-hover:scale-105">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {group.name}
                          </p>
                          {group.description && (
                            <p className="truncate text-xs text-muted-foreground">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {group._count?.members ?? group.members?.length ?? 0} members
                      </Badge>
                    </div>

                    <Separator className="my-3" />

                    {/* Member avatars row */}
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 5).map((member) => (
                          <Avatar
                            key={member.user.id}
                            className="h-6 w-6 border-2 border-card"
                          >
                            <AvatarFallback className="text-[10px]">
                              {getInitials(member.user.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {group.members.length > 5 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          +{group.members.length - 5} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
