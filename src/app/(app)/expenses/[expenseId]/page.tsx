'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth.context';
import ExpenseComments from '@/components/expenses/ExpenseComments';
import { useToast } from '@/lib/hooks/use-toast';
import { formatCurrency, formatDate, getInitials, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  User,
  Users,
  StickyNote,
  CheckCircle2,
  Clock,
  Loader2,
  Receipt,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpensePayer {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
}

interface ExpenseGroup {
  id: string;
  name: string;
}

interface ExpenseSplit {
  id: string;
  userId: string;
  amount: string;
  percentage: string | null;
  shares: number | null;
  settled: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ExpenseDetail {
  id: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  paidBy: string;
  groupId: string | null;
  category: string;
  receipt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payer: ExpensePayer;
  group: ExpenseGroup | null;
  splits: ExpenseSplit[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const categories = [
  'FOOD',
  'TRANSPORTATION',
  'ACCOMMODATION',
  'ENTERTAINMENT',
  'SHOPPING',
  'UTILITIES',
  'HEALTHCARE',
  'EDUCATION',
  'OTHER',
] as const;

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY'] as const;

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

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ExpenseDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-8 w-48" />
      </div>

      {/* Info card skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-10 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-48" />
        </CardContent>
      </Card>

      {/* Splits skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-20" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ExpenseDetailPage() {
  const { expenseId } = useParams();
  const router = useRouter();
  const { tokens, user } = useAuth();
  const { toast } = useToast();

  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    currency: 'USD',
    date: '',
    category: 'OTHER',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === expense?.paidBy;

  // -------------------------------------------------------------------------
  // Fetch expense
  // -------------------------------------------------------------------------

  const fetchExpense = useCallback(async () => {
    if (!tokens || !expenseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load expense (${res.status})`);
      }
      const data = await res.json();
      const fetched: ExpenseDetail = data.expense;
      setExpense(fetched);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load expense';
      setError(message);
      console.error('Failed to fetch expense', e);
    } finally {
      setLoading(false);
    }
  }, [tokens, expenseId]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  // -------------------------------------------------------------------------
  // Edit handlers
  // -------------------------------------------------------------------------

  function openEditDialog() {
    if (!expense) return;
    setEditForm({
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date.split('T')[0],
      category: expense.category,
      notes: expense.notes || '',
    });
    setEditOpen(true);
  }

  function updateEditField(field: string, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!tokens || !expenseId) return;
    if (!editForm.description.trim()) {
      toast({ variant: 'destructive', title: 'Description is required' });
      return;
    }
    const parsedAmount = parseFloat(editForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ variant: 'destructive', title: 'Amount must be greater than 0' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({
          description: editForm.description.trim(),
          amount: parsedAmount,
          currency: editForm.currency,
          date: editForm.date,
          category: editForm.category,
          notes: editForm.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update expense');
      }
      toast({ title: 'Expense updated successfully' });
      setEditOpen(false);
      fetchExpense();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update expense',
      });
    } finally {
      setIsSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------

  async function handleDelete() {
    if (!tokens || !expenseId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete expense');
      }
      toast({ title: 'Expense deleted' });
      router.push('/expenses');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete expense',
      });
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (loading) {
    return <ExpenseDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expenses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Expense Detail</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg font-semibold mb-1">Could not load expense</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={fetchExpense}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expenses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Expense Detail</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg font-semibold">Expense not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This expense may have been deleted or you do not have access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {expense.description}
          </h1>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            {/* Edit button (opens dialog) */}
            <Button variant="outline" size="icon" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" />
            </Button>

            {/* Delete button (opens confirmation dialog) */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Expense</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &ldquo;{expense.description}&rdquo;? This
                    action cannot be undone. All associated splits will also be removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Expense Info Card                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(parseFloat(expense.amount), expense.currency)}
              </p>
              <Badge
                variant="outline"
                className={cn('mt-2', categoryColors[expense.category] || categoryColors.OTHER)}
              >
                {expense.category.charAt(0) + expense.category.slice(1).toLowerCase()}
              </Badge>
            </div>
            {expense.receipt && (
              <a
                href={expense.receipt}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button variant="outline" size="sm">
                  <Receipt className="mr-2 h-4 w-4" />
                  Receipt
                </Button>
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />

          {/* Date */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{formatDate(expense.date)}</span>
          </div>

          {/* Paid by */}
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Paid by:</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {expense.payer.profilePicture && (
                  <AvatarImage src={expense.payer.profilePicture} alt={expense.payer.name} />
                )}
                <AvatarFallback className="text-[10px]">
                  {getInitials(expense.payer.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {expense.payer.id === user?.id ? 'You' : expense.payer.name}
              </span>
            </div>
          </div>

          {/* Group */}
          {expense.group && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Group:</span>
              <Link
                href={`/groups/${expense.group.id}`}
                className="font-medium text-primary hover:underline"
              >
                {expense.group.name}
              </Link>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <>
              <Separator />
              <div className="flex gap-3 text-sm">
                <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{expense.notes}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Splits Section                                                    */}
      {/* ----------------------------------------------------------------- */}
      {expense.splits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Splits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expense.splits.map((split) => {
                const isCurrentUser = split.userId === user?.id;
                return (
                  <div
                    key={split.id}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {getInitials(split.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isCurrentUser ? 'You' : split.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {split.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold">
                        {formatCurrency(parseFloat(split.amount), expense.currency)}
                      </span>
                      <Badge
                        variant={split.settled ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          split.settled
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent'
                            : ''
                        )}
                      >
                        {split.settled ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Settled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Comments                                                          */}
      {/* ----------------------------------------------------------------- */}
      {expense && <ExpenseComments expenseId={expense.id} />}

      {/* ----------------------------------------------------------------- */}
      {/* Edit Dialog                                                       */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the details of this expense.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => updateEditField('description', e.target.value)}
                placeholder="e.g., Dinner, Groceries..."
                required
              />
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editForm.amount}
                  onChange={(e) => updateEditField('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={editForm.currency}
                  onValueChange={(v) => updateEditField('currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => updateEditField('date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(v) => updateEditField('category', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0) + c.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => updateEditField('notes', e.target.value)}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
