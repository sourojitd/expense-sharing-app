'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth.context';
import { useToast } from '@/lib/hooks/use-toast';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  Settings,
  MessageCircle,
  BarChart3,
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  HandCoins,
  Shuffle,
  DollarSign,
  Download,
} from 'lucide-react';
import { cn, formatCurrency, getInitials } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string };
  }>;
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    paidBy: string;
    payer: { name: string };
  }>;
}

interface BalanceEntry {
  userId: string;
  userName: string;
  amount: number;
  currency: string;
}

interface GroupBalanceSummary {
  totalOwed: number;
  totalOwe: number;
  netBalance: number;
  currency: string;
  balances: BalanceEntry[];
}

interface SimplifiedDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Skeleton sub-components
// ---------------------------------------------------------------------------

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function BalanceListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Balances Tab Content
// ---------------------------------------------------------------------------

function BalancesTabContent({ groupId }: { groupId: string }) {
  const { tokens, user } = useAuth();
  const { toast } = useToast();

  const [balanceSummary, setBalanceSummary] = useState<GroupBalanceSummary | null>(null);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingSimplified, setLoadingSimplified] = useState(true);

  const fetchBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const res = await fetch(`/api/balances/group/${groupId}`, {
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalanceSummary(data.data ?? data);
      } else {
        toast({ variant: 'destructive', title: 'Failed to load balances' });
      }
    } catch (e) {
      console.error('Failed to fetch group balances', e);
      toast({ variant: 'destructive', title: 'Failed to load balances' });
    } finally {
      setLoadingBalances(false);
    }
  }, [groupId, tokens, toast]);

  const fetchSimplified = useCallback(async () => {
    setLoadingSimplified(true);
    try {
      const res = await fetch(`/api/balances/simplify/${groupId}`, {
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const debts = data.data ?? data;
        setSimplifiedDebts(Array.isArray(debts) ? debts : debts.debts ?? []);
      } else {
        toast({ variant: 'destructive', title: 'Failed to load simplified debts' });
      }
    } catch (e) {
      console.error('Failed to fetch simplified debts', e);
      toast({ variant: 'destructive', title: 'Failed to load simplified debts' });
    } finally {
      setLoadingSimplified(false);
    }
  }, [groupId, tokens, toast]);

  useEffect(() => {
    if (tokens && groupId) {
      fetchBalances();
      fetchSimplified();
    }
  }, [tokens, groupId, fetchBalances, fetchSimplified]);

  const currency = balanceSummary?.currency || 'USD';
  const youOwe = balanceSummary?.balances.filter((b) => b.amount < 0) || [];
  const youAreOwed = balanceSummary?.balances.filter((b) => b.amount > 0) || [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {loadingBalances ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <Card className="border-green-200/50 dark:border-green-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You&apos;re Owed
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(balanceSummary?.totalOwed || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {youAreOwed.length} {youAreOwed.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200/50 dark:border-red-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You Owe
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(balanceSummary?.totalOwe || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {youOwe.length} {youOwe.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Balance
                </CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    (balanceSummary?.netBalance || 0) > 0
                      ? 'text-green-600 dark:text-green-400'
                      : (balanceSummary?.netBalance || 0) < 0
                        ? 'text-red-600 dark:text-red-400'
                        : ''
                  )}
                >
                  {formatCurrency(balanceSummary?.netBalance || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(balanceSummary?.netBalance || 0) > 0
                    ? 'You are owed more overall'
                    : (balanceSummary?.netBalance || 0) < 0
                      ? 'You owe more overall'
                      : 'All settled up in this group'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Balance list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Member Balances</CardTitle>
                <p className="text-xs text-muted-foreground">From your perspective</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBalances ? (
            <BalanceListSkeleton count={3} />
          ) : !balanceSummary?.balances?.length ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">All settled up!</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                No outstanding balances in this group.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {balanceSummary.balances.map((balance) => {
                const owesYou = balance.amount > 0;
                return (
                  <div
                    key={balance.userId}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shrink-0',
                        owesYou
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {getInitials(balance.userName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {balance.userName}
                        {balance.userId === user?.id && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-semibold',
                          owesYou
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {owesYou
                          ? `owes you ${formatCurrency(balance.amount, balance.currency)}`
                          : `you owe ${formatCurrency(Math.abs(balance.amount), balance.currency)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          owesYou
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {owesYou ? '+' : '-'}
                        {formatCurrency(Math.abs(balance.amount), balance.currency)}
                      </span>
                      {!owesYou && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          asChild
                        >
                          <Link href="/settle">
                            <HandCoins className="h-3.5 w-3.5 mr-1.5" />
                            Settle
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simplified debts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Shuffle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Simplify Debts</CardTitle>
              <p className="text-xs text-muted-foreground">
                Optimized transactions to settle all debts
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSimplified ? (
            <BalanceListSkeleton count={2} />
          ) : simplifiedDebts.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Shuffle className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">No debts to simplify</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Everyone is settled up in this group.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {simplifiedDebts.map((debt, index) => {
                const isYouPaying = debt.fromUserId === user?.id;
                const isYouReceiving = debt.toUserId === user?.id;

                return (
                  <div
                    key={`${debt.fromUserId}-${debt.toUserId}-${index}`}
                    className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30"
                  >
                    {/* From user */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(debt.fromUserName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {isYouPaying ? 'You' : debt.fromUserName}
                      </span>
                    </div>

                    {/* Arrow with amount */}
                    <div className="flex flex-col items-center shrink-0 px-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-primary mt-0.5">
                        {formatCurrency(debt.amount, debt.currency)}
                      </span>
                    </div>

                    {/* To user */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      <span className="text-sm font-medium truncate">
                        {isYouReceiving ? 'You' : debt.toUserName}
                      </span>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(debt.toUserName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Settle Up link */}
                    {isYouPaying && (
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white shrink-0 ml-2"
                        asChild
                      >
                        <Link href="/settle">
                          <HandCoins className="h-3.5 w-3.5 mr-1.5" />
                          Settle Up
                        </Link>
                      </Button>
                    )}
                    {isYouReceiving && (
                      <Badge variant="secondary" className="shrink-0 ml-2">
                        Incoming
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { tokens, user } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${tokens?.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGroup(data.data?.group || data.group);
        }
      } catch (e) {
        console.error('Failed to fetch group', e);
      } finally {
        setLoading(false);
      }
    }
    if (tokens && groupId) fetchGroup();
  }, [tokens, groupId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-10 w-72" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Group not found</h2>
        <p className="text-muted-foreground mt-2">
          The group you are looking for does not exist or you do not have access.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/groups">Back to Groups</Link>
        </Button>
      </div>
    );
  }

  // Compute total group spending
  const totalGroupSpending = group.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const expenseCurrency = group.expenses?.[0]?.currency || 'USD';

  const handleExport = (format: 'csv' | 'pdf') => {
    window.open(`/api/export/expenses?format=${format}&groupId=${groupId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">{group.name}</h1>
            <Badge variant="secondary" className="shrink-0">
              <Users className="h-3 w-3 mr-1" />
              {group.members?.length || 0} members
            </Badge>
          </div>
          {group.description && (
            <p className="text-muted-foreground mt-0.5">{group.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/groups/${groupId}/chat`}>
              <MessageCircle className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/groups/${groupId}/analytics`}>
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/groups/${groupId}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Total group spending stat */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Group Spending</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalGroupSpending, expenseCurrency)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-muted-foreground">
              {group.expenses?.length || 0} expense{(group.expenses?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">
            <Receipt className="h-4 w-4 mr-1.5" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-1.5" />
            Members
          </TabsTrigger>
          <TabsTrigger value="balances">
            <Wallet className="h-4 w-4 mr-1.5" />
            Balances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" asChild>
              <Link href={`/expenses/new?groupId=${groupId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </div>
          {group.expenses?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-sm">No expenses yet</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Add your first expense to start tracking.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {group.expenses?.map((expense) => (
                <Link key={expense.id} href={`/expenses/${expense.id}`}>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-sm">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Paid by {expense.payer?.name || 'Unknown'} &middot;{' '}
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(expense.amount, expense.currency)}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="space-y-2">
            {group.members?.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.name}
                        {member.user.id === user?.id && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <BalancesTabContent groupId={groupId as string} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
