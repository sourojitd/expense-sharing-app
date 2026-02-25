'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Users,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useToast } from '@/lib/hooks/use-toast';

// Types
interface RecurringExpense {
  id: string;
  description: string;
  amount: number | string;
  currency: string;
  paidBy: string;
  groupId: string | null;
  category: string | null;
  splitType: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  isActive: boolean;
  participantData: { splits: { userId: string; amount: number }[] };
  payer: { id: string; name: string; email: string };
  group: { id: string; name: string } | null;
}

interface Group {
  id: string;
  name: string;
  members: { user: { id: string; name: string; email: string } }[];
}

type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const CATEGORY_OPTIONS = [
  'FOOD',
  'TRANSPORTATION',
  'ACCOMMODATION',
  'ENTERTAINMENT',
  'SHOPPING',
  'UTILITIES',
  'HEALTHCARE',
  'EDUCATION',
  'OTHER',
];

const frequencyColors: Record<string, string> = {
  DAILY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WEEKLY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BIWEEKLY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  MONTHLY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  QUARTERLY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  YEARLY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// Initial form state
const initialFormState = {
  description: '',
  amount: '',
  currency: 'USD',
  category: '',
  frequency: 'MONTHLY' as Frequency,
  startDate: '',
  endDate: '',
  groupId: '',
  splitType: 'EQUAL',
};

export default function RecurringExpensesPage() {
  const { tokens, user } = useAuth();
  const { toast } = useToast();

  // State
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<RecurringExpense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const authHeaders = {
    Authorization: `Bearer ${tokens?.accessToken}`,
    'Content-Type': 'application/json',
  };

  // Fetch recurring expenses
  const fetchRecurringExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/recurring-expenses', {
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecurringExpenses(data.recurringExpenses || []);
      }
    } catch (e) {
      console.error('Failed to fetch recurring expenses', e);
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups', {
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data?.groups || data.groups || []);
      }
    } catch (e) {
      console.error('Failed to fetch groups', e);
    }
  }, [tokens]);

  useEffect(() => {
    if (tokens) {
      fetchRecurringExpenses();
      fetchGroups();
    }
  }, [tokens, fetchRecurringExpenses, fetchGroups]);

  // Get group members for selected group
  const selectedGroup = groups.find((g) => g.id === form.groupId);
  const groupMembers = selectedGroup?.members || [];

  // Open add dialog
  function handleAdd() {
    setEditingExpense(null);
    setForm({
      ...initialFormState,
      startDate: new Date().toISOString().split('T')[0],
    });
    setFormOpen(true);
  }

  // Open edit dialog
  function handleEdit(expense: RecurringExpense) {
    setEditingExpense(expense);
    setForm({
      description: expense.description,
      amount: String(Number(expense.amount)),
      currency: expense.currency,
      category: expense.category || '',
      frequency: expense.frequency as Frequency,
      startDate: expense.startDate.split('T')[0],
      endDate: expense.endDate ? expense.endDate.split('T')[0] : '',
      groupId: expense.groupId || '',
      splitType: expense.splitType,
    });
    setFormOpen(true);
  }

  // Open delete confirmation
  function handleDeleteClick(expense: RecurringExpense) {
    setDeletingExpense(expense);
    setDeleteDialogOpen(true);
  }

  // Toggle pause/resume
  async function handleToggleActive(expense: RecurringExpense) {
    const action = expense.isActive ? 'pause' : 'resume';
    try {
      const res = await fetch(`/api/recurring-expenses/${expense.id}/${action}`, {
        method: 'PUT',
        headers: authHeaders,
      });

      if (res.ok) {
        toast({
          title: expense.isActive ? 'Paused' : 'Resumed',
          description: `"${expense.description}" has been ${action}d.`,
        });
        fetchRecurringExpenses();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || `Failed to ${action} recurring expense`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${action} recurring expense`,
        variant: 'destructive',
      });
    }
  }

  // Submit form (create or update)
  async function handleSubmit() {
    if (!form.description || !form.amount || !form.currency || !form.frequency || !form.startDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Build participants list
      let participants: { userId: string; amount: number }[] = [];

      if (form.groupId && groupMembers.length > 0) {
        // Split equally among group members
        const splitAmount = Math.round((amount / groupMembers.length) * 100) / 100;
        participants = groupMembers.map((m) => ({
          userId: m.user.id,
          amount: splitAmount,
        }));
        // Adjust rounding difference on first participant
        const totalSplit = splitAmount * groupMembers.length;
        const diff = Math.round((amount - totalSplit) * 100) / 100;
        if (diff !== 0 && participants.length > 0) {
          participants[0].amount = Math.round((participants[0].amount + diff) * 100) / 100;
        }
      } else if (user) {
        // Personal expense: just the current user
        participants = [{ userId: user.id, amount }];
      }

      const payload = {
        description: form.description,
        amount,
        currency: form.currency,
        category: form.category || undefined,
        splitType: form.splitType,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        groupId: form.groupId || undefined,
        participantData: { splits: participants },
      };

      let res: Response;

      if (editingExpense) {
        res = await fetch(`/api/recurring-expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/recurring-expenses', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast({
          title: editingExpense ? 'Updated' : 'Created',
          description: `Recurring expense "${form.description}" has been ${editingExpense ? 'updated' : 'created'}.`,
        });
        setFormOpen(false);
        fetchRecurringExpenses();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to save recurring expense',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save recurring expense',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Delete recurring expense
  async function handleDelete() {
    if (!deletingExpense) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/recurring-expenses/${deletingExpense.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (res.ok) {
        toast({
          title: 'Deleted',
          description: `"${deletingExpense.description}" has been deleted.`,
        });
        setDeleteDialogOpen(false);
        setDeletingExpense(null);
        fetchRecurringExpenses();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete recurring expense',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete recurring expense',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Expenses</h1>
          <p className="text-muted-foreground">
            Manage your automatically repeating expenses
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Recurring
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : recurringExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No recurring expenses</h3>
            <p className="text-muted-foreground mb-4">
              Set up recurring expenses to automatically track repeating costs
            </p>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Recurring Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recurringExpenses.map((expense) => (
            <Card
              key={expense.id}
              className={cn(
                'transition-colors',
                !expense.isActive && 'opacity-60'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {expense.description}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-xs',
                          frequencyColors[expense.frequency] || frequencyColors.MONTHLY
                        )}
                      >
                        {FREQUENCY_LABELS[expense.frequency] || expense.frequency}
                      </Badge>
                      {!expense.isActive && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Paused
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Next: {formatDate(expense.nextDueDate)}</span>
                      {expense.group && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <Users className="h-3 w-3" />
                          <span>{expense.group.name}</span>
                        </>
                      )}
                      {expense.category && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <span>{expense.category.toLowerCase()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <span className="font-semibold whitespace-nowrap">
                      {formatCurrency(Number(expense.amount), expense.currency)}
                    </span>

                    <Separator orientation="vertical" className="h-8" />

                    <div className="flex items-center gap-1">
                      <Switch
                        checked={expense.isActive}
                        onCheckedChange={() => handleToggleActive(expense)}
                        aria-label={expense.isActive ? 'Pause' : 'Resume'}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(expense)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(expense)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? 'Update the details of your recurring expense.'
                : 'Set up a new automatically repeating expense.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Monthly Rent"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => setForm({ ...form, currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={form.frequency}
                onValueChange={(value) =>
                  setForm({ ...form, frequency: value as Frequency })
                }
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date and End Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Group Selector */}
            <div className="space-y-2">
              <Label htmlFor="group">Group (optional)</Label>
              <Select
                value={form.groupId}
                onValueChange={(value) =>
                  setForm({ ...form, groupId: value === '_none' ? '' : value })
                }
              >
                <SelectTrigger id="group">
                  <SelectValue placeholder="No group (personal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No group (personal)</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group Members Info */}
            {form.groupId && groupMembers.length > 0 && (
              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Split equally among {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {groupMembers.map((m) => (
                    <Badge key={m.user.id} variant="secondary" className="text-xs">
                      {m.user.name}
                    </Badge>
                  ))}
                </div>
                {form.amount && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Each pays:{' '}
                    {formatCurrency(
                      Math.round((parseFloat(form.amount) / groupMembers.length) * 100) / 100,
                      form.currency
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? editingExpense
                  ? 'Updating...'
                  : 'Creating...'
                : editingExpense
                  ? 'Update'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Recurring Expense
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingExpense?.description}&quot;? This action
              cannot be undone. Previously generated expenses will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
