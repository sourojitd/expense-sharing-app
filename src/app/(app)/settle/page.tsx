'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { useApi } from '@/lib/hooks/useApi';
import { useToast } from '@/lib/hooks/use-toast';
import { cn, formatCurrency, formatRelativeTime, getInitials } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  HandCoins,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  Bell,
  Check,
  X,
  Loader2,
  Clock,
  CreditCard,
  History,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserBalance {
  userId: string;
  userName: string;
  amount: number; // positive = they owe you, negative = you owe them
  currency: string;
}

interface BalanceSummary {
  totalOwed: number;
  totalOwe: number;
  netBalance: number;
  currency: string;
  balances: UserBalance[];
}

interface PaymentUser {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
}

interface Payment {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  method: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  groupId: string | null;
  note: string | null;
  confirmedAt: string | null;
  createdAt: string;
  settledAt: string | null;
  fromUser: PaymentUser;
  toUser: PaymentUser;
  group?: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Sub-components
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

function PaymentHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0',
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: Payment['status'] }) {
  const config = {
    PENDING: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    },
    COMPLETED: {
      label: 'Completed',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    },
    FAILED: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    },
  };

  const { label, className } = config[status] || config.PENDING;

  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium', className)}>
      {label}
    </Badge>
  );
}

function MethodBadge({ method }: { method: string }) {
  const label =
    PAYMENT_METHODS.find((m) => m.value === method)?.label ||
    method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');

  return (
    <Badge variant="secondary" className="text-[10px] font-normal">
      {label}
    </Badge>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="h-10 w-10 text-muted-foreground mb-3" />
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settle Up Dialog
// ---------------------------------------------------------------------------

function SettleUpDialog({
  open,
  onOpenChange,
  balance,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: UserBalance | null;
  onSuccess: () => void;
}) {
  const { post } = useApi();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens with a new balance
  useEffect(() => {
    if (open && balance) {
      setAmount(Math.abs(balance.amount).toFixed(2));
      setMethod('');
      setNote('');
    }
  }, [open, balance]);

  const handleSubmit = async () => {
    if (!balance) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter a valid positive amount.',
      });
      return;
    }

    if (!method) {
      toast({
        variant: 'destructive',
        title: 'Payment method required',
        description: 'Please select a payment method.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await post('/api/payments', {
        toUserId: balance.userId,
        amount: numAmount,
        currency: balance.currency,
        method,
        note: note.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Payment recorded',
          description: `Payment of ${formatCurrency(numAmount, balance.currency)} to ${balance.userName} has been sent for confirmation.`,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: result.error || 'Something went wrong. Please try again.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!balance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            Settle Up
          </DialogTitle>
          <DialogDescription>
            Record a payment to {balance.userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Recipient info */}
          <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
            <UserAvatar name={balance.userName} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{balance.userName}</p>
              <p className="text-xs text-muted-foreground">
                You owe {formatCurrency(Math.abs(balance.amount), balance.currency)}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="settle-amount">Amount ({balance.currency})</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {balance.currency === 'USD' ? '$' : balance.currency === 'EUR' ? '\u20AC' : balance.currency === 'GBP' ? '\u00A3' : balance.currency === 'INR' ? '\u20B9' : ''}
              </span>
              <Input
                id="settle-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label htmlFor="settle-method">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="settle-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="settle-note">
              Note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="settle-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Settling dinner expenses"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SettlePage() {
  const { user } = useAuth();
  const { get, put } = useApi();
  const { toast } = useToast();

  // Data state
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Dialog state
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<UserBalance | null>(null);

  // Action loading states
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Derived data
  const youOwe = balanceSummary?.balances.filter((b) => b.amount < 0) || [];
  const youAreOwed = balanceSummary?.balances.filter((b) => b.amount > 0) || [];
  const currency = balanceSummary?.currency || user?.preferredCurrency || 'USD';

  // ---- Fetchers ----

  const fetchBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const result = await get<BalanceSummary>('/api/balances');
      if (result.success && result.data) {
        setBalanceSummary(result.data);
      }
    } catch (e) {
      console.error('Failed to fetch balances', e);
    } finally {
      setLoadingBalances(false);
    }
  }, [get]);

  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const result = await get<{ payments: Payment[] }>('/api/payments?limit=20');
      if (result.success && result.data) {
        const raw = result.data;
        const list = Array.isArray(raw) ? raw : (raw as { payments: Payment[] }).payments || [];
        setPayments(list);
      }
    } catch (e) {
      console.error('Failed to fetch payments', e);
    } finally {
      setLoadingPayments(false);
    }
  }, [get]);

  useEffect(() => {
    fetchBalances();
    fetchPayments();
  }, [fetchBalances, fetchPayments]);

  // ---- Handlers ----

  const handleSettleClick = (balance: UserBalance) => {
    setSelectedBalance(balance);
    setSettleDialogOpen(true);
  };

  const handleRemind = (balance: UserBalance) => {
    toast({
      title: 'Reminder sent',
      description: `A reminder has been sent to ${balance.userName}.`,
    });
  };

  const handleConfirmPayment = async (paymentId: string) => {
    setConfirmingId(paymentId);
    try {
      const result = await put(`/api/payments/${paymentId}/confirm`);
      if (result.success) {
        toast({ title: 'Payment confirmed', description: 'The payment has been marked as completed.' });
        fetchBalances();
        fetchPayments();
      } else {
        toast({ variant: 'destructive', title: 'Failed to confirm', description: result.error || 'Something went wrong.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to confirm payment.' });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    setRejectingId(paymentId);
    try {
      const result = await put(`/api/payments/${paymentId}/reject`);
      if (result.success) {
        toast({ title: 'Payment rejected', description: 'The payment has been rejected.' });
        fetchBalances();
        fetchPayments();
      } else {
        toast({ variant: 'destructive', title: 'Failed to reject', description: result.error || 'Something went wrong.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject payment.' });
    } finally {
      setRejectingId(null);
    }
  };

  const handleSettleSuccess = () => {
    fetchBalances();
    fetchPayments();
  };

  // Determine which pending payments the current user can act on (received payments)
  const pendingReceivedPayments = payments.filter(
    (p) => p.status === 'PENDING' && p.toUserId === user?.id
  );

  // ---- Render ----

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settle Up</h1>
        <p className="text-muted-foreground">View balances, record payments, and settle debts</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loadingBalances ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <Card className="border-red-200/50 dark:border-red-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total You Owe
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

            <Card className="border-green-200/50 dark:border-green-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total You&apos;re Owed
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
                      : 'All settled up'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Balance sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* You Owe */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-base">You Owe</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {youOwe.length === 0 ? 'No debts' : `${youOwe.length} outstanding`}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBalances ? (
              <BalanceListSkeleton count={2} />
            ) : youOwe.length === 0 ? (
              <EmptyState
                icon={HandCoins}
                title="You're all clear!"
                description="You don't owe anyone right now. Keep it up!"
              />
            ) : (
              <div className="space-y-1">
                {youOwe.map((balance) => (
                  <div
                    key={balance.userId}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <UserAvatar
                      name={balance.userName}
                      className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{balance.userName}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                        {formatCurrency(Math.abs(balance.amount), balance.currency)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSettleClick(balance)}
                      className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                    >
                      <HandCoins className="h-3.5 w-3.5 mr-1.5" />
                      Settle Up
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* You Are Owed */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-base">You Are Owed</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {youAreOwed.length === 0 ? 'No outstanding' : `${youAreOwed.length} outstanding`}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBalances ? (
              <BalanceListSkeleton count={2} />
            ) : youAreOwed.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No pending receivables"
                description="Nobody owes you money right now."
              />
            ) : (
              <div className="space-y-1">
                {youAreOwed.map((balance) => (
                  <div
                    key={balance.userId}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <UserAvatar
                      name={balance.userName}
                      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{balance.userName}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                        {formatCurrency(balance.amount, balance.currency)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemind(balance)}
                      className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 shrink-0"
                    >
                      <Bell className="h-3.5 w-3.5 mr-1.5" />
                      Remind
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending actions banner */}
      {pendingReceivedPayments.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-base">Pending Confirmations</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {pendingReceivedPayments.length} payment{pendingReceivedPayments.length > 1 ? 's' : ''} awaiting your confirmation
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingReceivedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  <UserAvatar
                    name={payment.fromUser.name}
                    className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payment.fromUser.name} paid you
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(Number(payment.amount), payment.currency)}
                      </span>
                      <MethodBadge method={payment.method} />
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(payment.createdAt)}
                      </span>
                    </div>
                    {payment.note && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        &quot;{payment.note}&quot;
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleConfirmPayment(payment.id)}
                      disabled={confirmingId === payment.id || rejectingId === payment.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {confirmingId === payment.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectPayment(payment.id)}
                      disabled={confirmingId === payment.id || rejectingId === payment.id}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {rejectingId === payment.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <div>
        <Separator className="mb-6" />
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <History className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Payment History</CardTitle>
                <p className="text-xs text-muted-foreground">Recent payment transactions</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <PaymentHistorySkeleton />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                description="Your payment history will appear here once you start settling up."
              />
            ) : (
              <div className="space-y-1">
                {payments.map((payment) => {
                  const isSender = payment.fromUserId === user?.id;
                  const otherPerson = isSender ? payment.toUser : payment.fromUser;

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    >
                      {/* Direction icon */}
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full shrink-0',
                          isSender
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-green-100 dark:bg-green-900/30'
                        )}
                      >
                        {isSender ? (
                          <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {isSender ? (
                            <>
                              You paid <span className="text-foreground">{otherPerson.name}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-foreground">{otherPerson.name}</span> paid you
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <MethodBadge method={payment.method} />
                          {payment.group && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {payment.group.name}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(payment.createdAt)}
                          </span>
                        </div>
                        {payment.note && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {payment.note}
                          </p>
                        )}
                      </div>

                      {/* Amount + Status */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            isSender
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          )}
                        >
                          {isSender ? '-' : '+'}
                          {formatCurrency(Number(payment.amount), payment.currency)}
                        </span>
                        <StatusBadge status={payment.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settle Up Dialog */}
      <SettleUpDialog
        open={settleDialogOpen}
        onOpenChange={setSettleDialogOpen}
        balance={selectedBalance}
        onSuccess={handleSettleSuccess}
      />
    </div>
  );
}
