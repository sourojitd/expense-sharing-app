'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Receipt, Filter, Download, FileText, FileDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

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

export default function ExpensesPage() {
  const { tokens } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      try {
        const res = await fetch('/api/expenses?limit=50', {
          headers: { Authorization: `Bearer ${tokens?.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setExpenses(data.data?.expenses || data.expenses || []);
        }
      } catch (e) {
        console.error('Failed to fetch expenses', e);
      } finally {
        setLoading(false);
      }
    }
    if (tokens) fetchExpenses();
  }, [tokens]);

  const handleExport = (format: 'csv' | 'pdf') => {
    window.open(`/api/export/expenses?format=${format}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">All your shared expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileDown className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link href="/expenses/new">
              <Plus className="mr-2 h-4 w-4" />
              New Expense
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No expenses yet</h3>
            <p className="text-muted-foreground mb-4">Add your first expense to get started</p>
            <Button asChild>
              <Link href="/expenses/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <Link key={expense.id} href={`/expenses/${expense.id}`}>
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Paid by {expense.payer?.name} &middot; {expense.group?.name || 'Personal'} &middot;{' '}
                        {formatDate(expense.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {expense.category && (
                      <Badge
                        variant="outline"
                        className={categoryColors[expense.category] || categoryColors.OTHER}
                      >
                        {expense.category.toLowerCase()}
                      </Badge>
                    )}
                    <span className="font-semibold whitespace-nowrap">
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
