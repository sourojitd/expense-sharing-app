'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  X,
  Receipt,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string | null;
  paidBy: string;
  payer: { name: string };
  group: { name: string } | null;
}

interface GroupOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

const categoryColors: Record<string, string> = {
  FOOD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  TRANSPORTATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACCOMMODATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ENTERTAINMENT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  SHOPPING: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UTILITIES: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HEALTHCARE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EDUCATION: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const { tokens } = useAuth();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [groupId, setGroupId] = useState('');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Results state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [offset, setOffset] = useState(0);

  // Groups for the filter dropdown
  const [groups, setGroups] = useState<GroupOption[]>([]);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch groups for filter dropdown
  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch('/api/groups', {
          headers: { Authorization: `Bearer ${tokens?.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const groupList = data.data?.groups || data.groups || [];
          setGroups(groupList.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })));
        }
      } catch (e) {
        console.error('Failed to fetch groups', e);
      }
    }
    if (tokens) fetchGroups();
  }, [tokens]);

  // Build query string from filters
  const buildQueryString = useCallback(
    (currentOffset: number) => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(currentOffset));

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (groupId) params.set('groupId', groupId);
      if (category) params.set('category', category);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (amountMin) params.set('amountMin', amountMin);
      if (amountMax) params.set('amountMax', amountMax);

      return params.toString();
    },
    [searchQuery, groupId, category, dateFrom, dateTo, amountMin, amountMax]
  );

  // Search function
  const performSearch = useCallback(
    async (append = false) => {
      if (!tokens) return;

      const currentOffset = append ? offset + PAGE_SIZE : 0;
      if (!append) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      try {
        const qs = buildQueryString(append ? currentOffset : 0);
        const res = await fetch(`/api/expenses?${qs}`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          const results = data.expenses || [];
          const count = data.totalCount ?? results.length;

          if (append) {
            setExpenses((prev) => [...prev, ...results]);
            setOffset(currentOffset);
          } else {
            setExpenses(results);
            setTotalCount(count);
          }
          setHasSearched(true);
        }
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tokens, buildQueryString, offset]
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, groupId, category, dateFrom, dateTo, amountMin, amountMax]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setGroupId('');
    setCategory('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  };

  const hasActiveFilters = searchQuery || groupId || category || dateFrom || dateTo || amountMin || amountMax;
  const hasMoreResults = expenses.length < totalCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Expenses</h1>
        <p className="text-muted-foreground">
          Find expenses across all your groups with advanced filters
        </p>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Filters
              {showFilters ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="shrink-0">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Group filter */}
              <div className="space-y-1.5">
                <Label className="text-xs">Group</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category filter */}
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-1.5">
                <Label className="text-xs">Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-1.5">
                <Label className="text-xs">Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {/* Amount Min */}
              <div className="space-y-1.5">
                <Label className="text-xs">Min Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                />
              </div>

              {/* Amount Max */}
              <div className="space-y-1.5">
                <Label className="text-xs">Max Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !hasSearched ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Search your expenses</h3>
            <p className="text-muted-foreground text-sm">
              Type a description or use filters to find expenses across all groups
            </p>
          </CardContent>
        </Card>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No expenses found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Result count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{totalCount} result{totalCount !== 1 ? 's' : ''}</Badge>
          </div>

          {/* Expense list */}
          <div className="space-y-2">
            {expenses.map((expense) => (
              <Link key={expense.id} href={`/expenses/${expense.id}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{expense.description}</p>
                        {expense.category && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] shrink-0 ${categoryColors[expense.category.toUpperCase()] || categoryColors.OTHER}`}
                          >
                            {expense.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Paid by {expense.payer?.name || 'Unknown'}
                        {expense.group && (
                          <>
                            {' '}
                            &middot; <span className="font-medium">{expense.group.name}</span>
                          </>
                        )}
                        {' '}&middot; {formatDate(expense.date)}
                      </p>
                    </div>
                    <span className="font-semibold text-sm shrink-0 ml-4">
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Load more */}
          {hasMoreResults && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => performSearch(true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
