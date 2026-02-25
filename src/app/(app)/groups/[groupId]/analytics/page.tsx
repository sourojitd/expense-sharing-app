'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth.context';
import { useToast } from '@/lib/hooks/use-toast';
import { formatCurrency, formatDate, getInitials, cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import {
  ArrowLeft,
  DollarSign,
  Receipt,
  TrendingUp,
  Tag,
  Trophy,
  AlertCircle,
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// ---------------------------------------------------------------------------
// Chart Colors
// ---------------------------------------------------------------------------

const COLORS = [
  'hsl(var(--primary))',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#f97316',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupAnalytics {
  totalSpent: number;
  expenseCount: number;
  averageExpense: number;
  currency: string;
  spendingByCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  spendingOverTime: Array<{ date: string; amount: number }>;
  memberSpending: Array<{
    userId: string;
    userName: string;
    totalPaid: number;
    totalOwed: number;
  }>;
  topExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
}

// ---------------------------------------------------------------------------
// Skeleton loaders
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

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for Line Chart
// ---------------------------------------------------------------------------

interface LineTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  currency: string;
}

function LineChartTooltip({ active, payload, label, currency }: LineTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-xs text-muted-foreground mb-1">
        {label ? formatDate(label, { month: 'short', day: 'numeric', year: undefined }) : ''}
      </p>
      <p className="text-sm font-semibold">{formatCurrency(payload[0].value, currency)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for Pie Chart
// ---------------------------------------------------------------------------

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percentage: number } }>;
  currency: string;
}

function PieChartTooltip({ active, payload, currency }: PieTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-xs font-medium mb-1">{data.name}</p>
      <p className="text-sm font-semibold">{formatCurrency(data.value, currency)}</p>
      <p className="text-xs text-muted-foreground">{data.payload.percentage.toFixed(1)}%</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for Bar Chart
// ---------------------------------------------------------------------------

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { userName: string } }>;
  currency: string;
}

function BarChartTooltip({ active, payload, currency }: BarTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-xs font-medium mb-1">{payload[0].payload.userName}</p>
      <p className="text-sm font-semibold">{formatCurrency(payload[0].value, currency)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format axis date label
// ---------------------------------------------------------------------------

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function GroupAnalyticsPage() {
  const { groupId } = useParams();
  const { tokens } = useAuth();
  const { toast } = useToast();

  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!tokens?.accessToken || !groupId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/analytics`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load analytics');
      }

      const data = await res.json();
      setAnalytics(data.analytics);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(message);
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setLoading(false);
    }
  }, [tokens, groupId, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        {/* Summary cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
        {/* Charts skeleton */}
        <ChartSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/groups/${groupId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Group Analytics</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">Failed to load analytics</h3>
            <p className="text-xs text-muted-foreground max-w-xs text-center mb-4">
              {error || 'Something went wrong. Please try again.'}
            </p>
            <Button variant="outline" size="sm" onClick={fetchAnalytics}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Derived data ----
  const currency = analytics.currency;
  const mostActiveCategory =
    analytics.spendingByCategory.length > 0
      ? analytics.spendingByCategory[0]
      : null;

  // Determine max paid for bar chart scaling
  const maxPaid = Math.max(...analytics.memberSpending.map((m) => m.totalPaid), 1);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/groups/${groupId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Group Analytics</h1>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Summary Cards                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Spent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalSpent, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all expenses</p>
          </CardContent>
        </Card>

        {/* Number of Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.expenseCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total transactions</p>
          </CardContent>
        </Card>

        {/* Average Expense */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Expense
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.averageExpense, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>

        {/* Most Active Category */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Category
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {mostActiveCategory ? mostActiveCategory.category : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mostActiveCategory
                ? `${mostActiveCategory.count} expense${mostActiveCategory.count !== 1 ? 's' : ''} (${mostActiveCategory.percentage.toFixed(0)}%)`
                : 'No expenses yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Spending Over Time (Line Chart)                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Over Time</CardTitle>
          <CardDescription>Daily spending for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.spendingOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.spendingOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => formatCurrency(v, currency)}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  width={80}
                />
                <Tooltip content={<LineChartTooltip currency={currency} />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              No spending data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Category Breakdown + Member Spending (side by side on large)        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown - Pie Chart + Table */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>How spending is distributed by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analytics.spendingByCategory.length > 0 ? (
              <>
                {/* Donut Chart */}
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analytics.spendingByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="category"
                    >
                      {analytics.spendingByCategory.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieChartTooltip currency={currency} />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Category Table */}
                <div className="space-y-3">
                  {analytics.spendingByCategory.map((cat, index) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{cat.category}</span>
                          <span className="text-muted-foreground">
                            ({cat.count})
                          </span>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(cat.amount, currency)}
                        </span>
                      </div>
                      {/* Percentage bar */}
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Spending - Bar Chart + Table */}
        <Card>
          <CardHeader>
            <CardTitle>Member Spending</CardTitle>
            <CardDescription>How much each member has paid and owes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analytics.memberSpending.length > 0 ? (
              <>
                {/* Horizontal Bar Chart */}
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={analytics.memberSpending}
                    layout="vertical"
                    margin={{ left: 0, right: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => formatCurrency(v, currency)}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="userName"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      width={80}
                    />
                    <Tooltip content={<BarChartTooltip currency={currency} />} />
                    <Bar dataKey="totalPaid" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <Separator />

                {/* Member Table */}
                <div className="space-y-3">
                  {analytics.memberSpending.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.userName}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>
                            Paid:{' '}
                            <span className="font-semibold text-foreground">
                              {formatCurrency(member.totalPaid, currency)}
                            </span>
                          </span>
                          <span>
                            Owes:{' '}
                            <span className="font-semibold text-foreground">
                              {formatCurrency(member.totalOwed, currency)}
                            </span>
                          </span>
                        </div>
                      </div>
                      {/* Mini bar indicator */}
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(member.totalPaid / maxPaid) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No member data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Top Expenses                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Top Expenses</CardTitle>
              <CardDescription>The 5 largest expenses in this group</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analytics.topExpenses.length > 0 ? (
            <div className="space-y-3">
              {analytics.topExpenses.map((expense, index) => (
                <div
                  key={expense.id}
                  className={cn(
                    'flex items-center gap-4 rounded-lg p-3 transition-colors',
                    'hover:bg-accent/50'
                  )}
                >
                  {/* Rank */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold shrink-0">
                    {index + 1}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{expense.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(expense.date)}
                      </span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {expense.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-bold tabular-nums shrink-0">
                    {formatCurrency(expense.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">No expenses yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Add expenses to this group to see analytics.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
