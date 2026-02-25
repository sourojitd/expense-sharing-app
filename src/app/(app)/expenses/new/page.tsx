'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { formatCurrency, getInitials, cn } from '@/lib/utils';
import {
  Loader2,
  ArrowLeft,
  Users,
  Receipt,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Split,
} from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const categories = [
  'FOOD', 'TRANSPORTATION', 'ACCOMMODATION', 'ENTERTAINMENT',
  'SHOPPING', 'UTILITIES', 'HEALTHCARE', 'EDUCATION', 'OTHER',
] as const;

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY'] as const;

const SPLIT_TYPES = [
  { value: 'EQUAL', label: 'Equal split', description: 'Split evenly among selected participants' },
  { value: 'EXACT', label: 'Exact amounts', description: 'Specify exactly how much each person owes' },
  { value: 'PERCENTAGE', label: 'By percentage', description: 'Split by percentage of the total' },
  { value: 'SHARES', label: 'By shares', description: 'Split based on share ratios' },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: '🍔',
  TRANSPORTATION: '🚗',
  ACCOMMODATION: '🏠',
  ENTERTAINMENT: '🎬',
  SHOPPING: '🛍️',
  UTILITIES: '💡',
  HEALTHCARE: '🏥',
  EDUCATION: '📚',
  OTHER: '📦',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Participant {
  id: string;
  name: string;
  email: string;
}

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Group {
  id: string;
  name: string;
  members?: GroupMember[];
}

interface SplitEntry {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewExpensePage() {
  const { tokens, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const preselectedGroupId = searchParams.get('groupId');

  // ---- Data loading states ----
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Participant[]>([]);
  const [groupMembers, setGroupMembers] = useState<Participant[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Form state ----
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.preferredCurrency || 'USD');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupId, setGroupId] = useState(preselectedGroupId || '');
  const [category, setCategory] = useState('OTHER');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'>('EQUAL');
  const [paidBy, setPaidBy] = useState(user?.id || '');

  // ---- Participant selection ----
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());

  // ---- Split configuration (keyed by userId) ----
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  // ---- Derived values ----
  const parsedAmount = parseFloat(amount) || 0;

  // The available participant pool depends on whether a group is selected
  const availableParticipants: Participant[] = useMemo(() => {
    if (groupId && groupId !== 'none') {
      return groupMembers;
    }
    // No group: current user + friends
    const currentUser: Participant | null = user
      ? { id: user.id, name: user.name, email: user.email }
      : null;
    const allParticipants = currentUser ? [currentUser] : [];
    for (const f of friends) {
      if (!allParticipants.some((p) => p.id === f.id)) {
        allParticipants.push(f);
      }
    }
    return allParticipants;
  }, [groupId, groupMembers, friends, user]);

  const selectedParticipants = useMemo(
    () => availableParticipants.filter((p) => selectedParticipantIds.has(p.id)),
    [availableParticipants, selectedParticipantIds],
  );

  // Payer options: if group is selected, group members. Otherwise current user + selected participants.
  const payerOptions: Participant[] = useMemo(() => {
    if (groupId && groupId !== 'none') {
      return groupMembers;
    }
    // Deduplicate current user with selected participants
    const options: Participant[] = [];
    if (user) {
      options.push({ id: user.id, name: user.name, email: user.email });
    }
    for (const p of selectedParticipants) {
      if (!options.some((o) => o.id === p.id)) {
        options.push(p);
      }
    }
    return options;
  }, [groupId, groupMembers, selectedParticipants, user]);

  // -----------------------------------------------------------------------
  // Computed splits
  // -----------------------------------------------------------------------

  const computedSplits: SplitEntry[] = useMemo(() => {
    if (selectedParticipants.length === 0 || parsedAmount <= 0) return [];

    switch (splitType) {
      case 'EQUAL': {
        const perPerson = Math.round((parsedAmount / selectedParticipants.length) * 100) / 100;
        // Distribute rounding remainder to first participant
        const total = perPerson * selectedParticipants.length;
        const diff = Math.round((parsedAmount - total) * 100) / 100;
        return selectedParticipants.map((p, i) => ({
          userId: p.id,
          amount: i === 0 ? Math.round((perPerson + diff) * 100) / 100 : perPerson,
        }));
      }
      case 'EXACT': {
        return selectedParticipants.map((p) => ({
          userId: p.id,
          amount: parseFloat(exactAmounts[p.id] || '0') || 0,
        }));
      }
      case 'PERCENTAGE': {
        return selectedParticipants.map((p) => {
          const pct = parseFloat(percentages[p.id] || '0') || 0;
          return {
            userId: p.id,
            amount: Math.round((parsedAmount * pct) / 100 * 100) / 100,
            percentage: pct,
          };
        });
      }
      case 'SHARES': {
        const shareValues = selectedParticipants.map((p) => ({
          userId: p.id,
          shareCount: parseFloat(shares[p.id] || '1') || 0,
        }));
        const totalShares = shareValues.reduce((sum, s) => sum + s.shareCount, 0);
        if (totalShares === 0) {
          return selectedParticipants.map((p) => ({ userId: p.id, amount: 0, shares: 0 }));
        }
        return shareValues.map((s) => ({
          userId: s.userId,
          amount: Math.round((parsedAmount * s.shareCount) / totalShares * 100) / 100,
          shares: s.shareCount,
        }));
      }
      default:
        return [];
    }
  }, [splitType, selectedParticipants, parsedAmount, exactAmounts, percentages, shares]);

  // -----------------------------------------------------------------------
  // Validation helpers
  // -----------------------------------------------------------------------

  const exactTotal = useMemo(
    () => computedSplits.reduce((sum, s) => sum + s.amount, 0),
    [computedSplits],
  );

  const percentageTotal = useMemo(
    () =>
      selectedParticipants.reduce(
        (sum, p) => sum + (parseFloat(percentages[p.id] || '0') || 0),
        0,
      ),
    [selectedParticipants, percentages],
  );

  const splitValidation = useMemo(() => {
    if (selectedParticipants.length === 0) {
      return { valid: false, message: 'Select at least one participant' };
    }
    if (parsedAmount <= 0) {
      return { valid: false, message: 'Enter a valid amount' };
    }
    switch (splitType) {
      case 'EQUAL':
        return { valid: true, message: '' };
      case 'EXACT': {
        const roundedExactTotal = Math.round(exactTotal * 100) / 100;
        const roundedAmount = Math.round(parsedAmount * 100) / 100;
        if (roundedExactTotal !== roundedAmount) {
          const diff = roundedAmount - roundedExactTotal;
          return {
            valid: false,
            message: `Amounts ${diff > 0 ? 'under' : 'over'} by ${formatCurrency(Math.abs(diff), currency)}. Total must equal ${formatCurrency(roundedAmount, currency)}.`,
          };
        }
        return { valid: true, message: '' };
      }
      case 'PERCENTAGE': {
        const roundedPctTotal = Math.round(percentageTotal * 100) / 100;
        if (roundedPctTotal !== 100) {
          return {
            valid: false,
            message: `Percentages total ${roundedPctTotal}%. Must equal 100%.`,
          };
        }
        return { valid: true, message: '' };
      }
      case 'SHARES': {
        const totalShareCount = selectedParticipants.reduce(
          (sum, p) => sum + (parseFloat(shares[p.id] || '1') || 0),
          0,
        );
        if (totalShareCount <= 0) {
          return { valid: false, message: 'Total shares must be greater than 0' };
        }
        return { valid: true, message: '' };
      }
      default:
        return { valid: true, message: '' };
    }
  }, [splitType, selectedParticipants, parsedAmount, exactTotal, percentageTotal, shares, currency]);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  // Fetch groups list
  useEffect(() => {
    async function fetchGroups() {
      setIsLoadingGroups(true);
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
      } finally {
        setIsLoadingGroups(false);
      }
    }
    if (tokens) fetchGroups();
  }, [tokens]);

  // Fetch group members when groupId changes
  const fetchGroupMembers = useCallback(
    async (gId: string) => {
      if (!gId || gId === 'none') {
        setGroupMembers([]);
        return;
      }
      setIsLoadingMembers(true);
      try {
        const res = await fetch(`/api/groups/${gId}`, {
          headers: { Authorization: `Bearer ${tokens?.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const group = data.data?.group || data.group;
          if (group?.members) {
            const members: Participant[] = group.members.map((m: GroupMember) => ({
              id: m.user.id || m.userId,
              name: m.user.name,
              email: m.user.email,
            }));
            setGroupMembers(members);
            // Auto-select all group members
            setSelectedParticipantIds(new Set(members.map((m: Participant) => m.id)));
            // Reset split entries
            resetSplitEntries(members);
          }
        }
      } catch (e) {
        console.error('Failed to fetch group members', e);
      } finally {
        setIsLoadingMembers(false);
      }
    },
    [tokens],
  );

  // Fetch friends for non-group expenses
  useEffect(() => {
    async function fetchFriends() {
      setIsLoadingFriends(true);
      try {
        const res = await fetch('/api/friends', {
          headers: { Authorization: `Bearer ${tokens?.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFriends(data.data?.friends || data.friends || []);
        }
      } catch (e) {
        console.error('Failed to fetch friends', e);
      } finally {
        setIsLoadingFriends(false);
      }
    }
    if (tokens) fetchFriends();
  }, [tokens]);

  // Load group members on initial mount or when group changes
  useEffect(() => {
    if (groupId && groupId !== 'none') {
      fetchGroupMembers(groupId);
    } else {
      setGroupMembers([]);
      // When switching away from a group, auto-select current user
      if (user) {
        setSelectedParticipantIds(new Set([user.id]));
      }
    }
  }, [groupId, fetchGroupMembers, user]);

  // Ensure paidBy defaults to current user
  useEffect(() => {
    if (user && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user, paidBy]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function resetSplitEntries(participants: Participant[]) {
    const newExact: Record<string, string> = {};
    const newPct: Record<string, string> = {};
    const newShares: Record<string, string> = {};
    for (const p of participants) {
      newExact[p.id] = '';
      newPct[p.id] = '';
      newShares[p.id] = '1';
    }
    setExactAmounts(newExact);
    setPercentages(newPct);
    setShares(newShares);
  }

  function toggleParticipant(id: string) {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedParticipantIds.size === availableParticipants.length) {
      setSelectedParticipantIds(new Set());
    } else {
      setSelectedParticipantIds(new Set(availableParticipants.map((p) => p.id)));
    }
  }

  function handleGroupChange(value: string) {
    const resolvedValue = value === 'none' ? '' : value;
    setGroupId(resolvedValue);
    // Reset participants and splits when group changes
    setSelectedParticipantIds(new Set());
    resetSplitEntries([]);
  }

  function handleSplitTypeChange(value: string) {
    setSplitType(value as typeof splitType);
    // Initialize default shares when switching to SHARES
    if (value === 'SHARES') {
      const newShares: Record<string, string> = {};
      for (const p of selectedParticipants) {
        newShares[p.id] = shares[p.id] || '1';
      }
      setShares(newShares);
    }
  }

  function distributeExactEvenly() {
    if (selectedParticipants.length === 0 || parsedAmount <= 0) return;
    const perPerson = (parsedAmount / selectedParticipants.length).toFixed(2);
    const newExact: Record<string, string> = {};
    for (const p of selectedParticipants) {
      newExact[p.id] = perPerson;
    }
    // Fix rounding: adjust first person
    const totalDistributed = parseFloat(perPerson) * selectedParticipants.length;
    const diff = Math.round((parsedAmount - totalDistributed) * 100) / 100;
    if (diff !== 0 && selectedParticipants.length > 0) {
      const firstId = selectedParticipants[0].id;
      newExact[firstId] = (parseFloat(perPerson) + diff).toFixed(2);
    }
    setExactAmounts(newExact);
  }

  function distributePercentageEvenly() {
    if (selectedParticipants.length === 0) return;
    const perPerson = (100 / selectedParticipants.length).toFixed(2);
    const newPct: Record<string, string> = {};
    for (const p of selectedParticipants) {
      newPct[p.id] = perPerson;
    }
    // Fix rounding
    const totalPct = parseFloat(perPerson) * selectedParticipants.length;
    const diff = Math.round((100 - totalPct) * 100) / 100;
    if (diff !== 0 && selectedParticipants.length > 0) {
      const firstId = selectedParticipants[0].id;
      newPct[firstId] = (parseFloat(perPerson) + diff).toFixed(2);
    }
    setPercentages(newPct);
  }

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a description' });
      return;
    }
    if (parsedAmount <= 0) {
      toast({ variant: 'destructive', title: 'Amount must be greater than 0' });
      return;
    }
    if (selectedParticipants.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one participant' });
      return;
    }
    if (!splitValidation.valid) {
      toast({ variant: 'destructive', title: 'Split error', description: splitValidation.message });
      return;
    }
    if (!paidBy) {
      toast({ variant: 'destructive', title: 'Select who paid for this expense' });
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        description: description.trim(),
        amount: parsedAmount,
        currency,
        date,
        category,
        notes: notes.trim() || undefined,
        paidBy,
        splitType,
        splits: computedSplits.map((s) => ({
          userId: s.userId,
          amount: s.amount,
        })),
      };
      if (groupId && groupId !== 'none') {
        body.groupId = groupId;
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create expense');
      }

      toast({ title: 'Expense added successfully!' });

      if (groupId && groupId !== 'none') {
        router.push(`/groups/${groupId}`);
      } else {
        router.push('/expenses');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create expense.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderParticipantRow(p: Participant) {
    const isSelected = selectedParticipantIds.has(p.id);
    const isCurrentUser = p.id === user?.id;

    return (
      <label
        key={p.id}
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/30',
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleParticipant(p.id)}
        />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getInitials(p.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {p.name}
            {isCurrentUser && (
              <span className="text-muted-foreground ml-1">(you)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">{p.email}</p>
        </div>
      </label>
    );
  }

  function renderSplitConfig() {
    if (selectedParticipants.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Select participants above to configure the split.
        </div>
      );
    }

    if (parsedAmount <= 0) {
      return (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Enter an amount above to configure the split.
        </div>
      );
    }

    switch (splitType) {
      case 'EQUAL':
        return renderEqualSplit();
      case 'EXACT':
        return renderExactSplit();
      case 'PERCENTAGE':
        return renderPercentageSplit();
      case 'SHARES':
        return renderSharesSplit();
      default:
        return null;
    }
  }

  function renderEqualSplit() {
    const perPerson = selectedParticipants.length > 0
      ? parsedAmount / selectedParticipants.length
      : 0;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Split equally among {selectedParticipants.length} {selectedParticipants.length === 1 ? 'person' : 'people'}</span>
          <Badge variant="secondary">{formatCurrency(perPerson, currency)} per person</Badge>
        </div>
        <div className="space-y-2">
          {selectedParticipants.map((p) => {
            const split = computedSplits.find((s) => s.userId === p.id);
            return (
              <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">{getInitials(p.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{p.name}{p.id === user?.id ? ' (you)' : ''}</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(split?.amount || 0, currency)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderExactSplit() {
    const roundedExactTotal = Math.round(exactTotal * 100) / 100;
    const remaining = Math.round((parsedAmount - roundedExactTotal) * 100) / 100;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Enter exact amounts</span>
          <Button type="button" variant="outline" size="sm" onClick={distributeExactEvenly}>
            Split evenly
          </Button>
        </div>
        <div className="space-y-2">
          {selectedParticipants.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px]">{getInitials(p.name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1 min-w-0 truncate">{p.name}{p.id === user?.id ? ' (you)' : ''}</span>
              <div className="w-28 shrink-0">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={exactAmounts[p.id] || ''}
                  onChange={(e) =>
                    setExactAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        <div className={cn(
          'flex items-center justify-between text-sm font-medium p-2 rounded-md',
          remaining === 0 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
        )}>
          <span>Total assigned: {formatCurrency(roundedExactTotal, currency)}</span>
          {remaining !== 0 && (
            <span>{remaining > 0 ? `${formatCurrency(remaining, currency)} remaining` : `${formatCurrency(Math.abs(remaining), currency)} over`}</span>
          )}
          {remaining === 0 && (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </div>
      </div>
    );
  }

  function renderPercentageSplit() {
    const roundedPctTotal = Math.round(percentageTotal * 100) / 100;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Enter percentages</span>
          <Button type="button" variant="outline" size="sm" onClick={distributePercentageEvenly}>
            Split evenly
          </Button>
        </div>
        <div className="space-y-2">
          {selectedParticipants.map((p) => {
            const pct = parseFloat(percentages[p.id] || '0') || 0;
            const computedAmount = Math.round((parsedAmount * pct) / 100 * 100) / 100;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{getInitials(p.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1 min-w-0 truncate">{p.name}{p.id === user?.id ? ' (you)' : ''}</span>
                <div className="w-20 shrink-0">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={percentages[p.id] || ''}
                      onChange={(e) =>
                        setPercentages((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      className="h-8 text-sm pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                  {formatCurrency(computedAmount, currency)}
                </span>
              </div>
            );
          })}
        </div>
        <div className={cn(
          'flex items-center justify-between text-sm font-medium p-2 rounded-md',
          roundedPctTotal === 100 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
        )}>
          <span>Total: {roundedPctTotal}%</span>
          {roundedPctTotal !== 100 && (
            <span>{roundedPctTotal < 100 ? `${(100 - roundedPctTotal).toFixed(2)}% remaining` : `${(roundedPctTotal - 100).toFixed(2)}% over`}</span>
          )}
          {roundedPctTotal === 100 && (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </div>
      </div>
    );
  }

  function renderSharesSplit() {
    const totalShareCount = selectedParticipants.reduce(
      (sum, p) => sum + (parseFloat(shares[p.id] || '1') || 0),
      0,
    );

    return (
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">Assign share counts (higher shares = larger portion)</span>
        <div className="space-y-2">
          {selectedParticipants.map((p) => {
            const shareCount = parseFloat(shares[p.id] || '1') || 0;
            const computedAmount = totalShareCount > 0
              ? Math.round((parsedAmount * shareCount) / totalShareCount * 100) / 100
              : 0;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{getInitials(p.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1 min-w-0 truncate">{p.name}{p.id === user?.id ? ' (you)' : ''}</span>
                <div className="w-20 shrink-0">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="1"
                    value={shares[p.id] || ''}
                    onChange={(e) =>
                      setShares((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                  {formatCurrency(computedAmount, currency)}
                </span>
              </div>
            );
          })}
        </div>
        {totalShareCount > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground p-2 rounded-md bg-muted/50">
            <span>Total shares: {totalShareCount}</span>
            <span>Each share = {formatCurrency(parsedAmount / totalShareCount, currency)}</span>
          </div>
        )}
      </div>
    );
  }

  function renderSummary() {
    if (computedSplits.length === 0 || parsedAmount <= 0 || !splitValidation.valid) {
      return null;
    }

    const payer = availableParticipants.find((p) => p.id === paidBy) ||
      (user ? { id: user.id, name: user.name, email: user.email } : null);

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-base">{formatCurrency(parsedAmount, currency)}</span>
          </div>
          {payer && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Paid by</span>
              <span className="font-medium">{payer.name}{payer.id === user?.id ? ' (you)' : ''}</span>
            </div>
          )}
          <Separator />
          <div className="space-y-2">
            {computedSplits.map((split) => {
              const participant = availableParticipants.find((p) => p.id === split.userId);
              if (!participant) return null;
              const isCurrentUser = participant.id === user?.id;
              const isPayer = participant.id === paidBy;

              return (
                <div key={split.userId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{getInitials(participant.name)}</AvatarFallback>
                    </Avatar>
                    <span>
                      {participant.name}
                      {isCurrentUser ? ' (you)' : ''}
                    </span>
                    {isPayer && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">paid</Badge>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(split.amount, currency)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/expenses">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to expenses
        </Link>
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ============================================================= */}
        {/* SECTION 1: Basic Details */}
        {/* ============================================================= */}
        <Card>
          <CardHeader>
            <CardTitle>Add an expense</CardTitle>
            <CardDescription>Record a shared expense and split it with others</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Dinner, Groceries, Uber ride..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[c]}</span>
                          <span>{c.charAt(0) + c.slice(1).toLowerCase()}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group Selection */}
            <div className="space-y-2">
              <Label>Group (optional)</Label>
              {isLoadingGroups ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={groupId || 'none'} onValueChange={handleGroupChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No group (personal)</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* ============================================================= */}
        {/* SECTION 2: Payer Selection */}
        {/* ============================================================= */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Paid by
            </CardTitle>
            <CardDescription>Who paid for this expense?</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent>
                  {payerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.id === user?.id ? ' (you)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* ============================================================= */}
        {/* SECTION 3: Participant Selection */}
        {/* ============================================================= */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants
            </CardTitle>
            <CardDescription>
              {groupId && groupId !== 'none'
                ? 'Select which group members to include in this split'
                : 'Select friends to split with'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingMembers || isLoadingFriends ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : availableParticipants.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                {groupId && groupId !== 'none'
                  ? 'No members found in this group.'
                  : 'No friends found. Add friends first to split expenses.'}
              </div>
            ) : (
              <>
                {/* Select All toggle */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={
                        availableParticipants.length > 0 &&
                        selectedParticipantIds.size === availableParticipants.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="font-medium">Select all</span>
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {selectedParticipantIds.size} of {availableParticipants.length} selected
                  </span>
                </div>

                <Separator />

                {/* Participant list */}
                <div className="grid gap-2">
                  {availableParticipants.map(renderParticipantRow)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ============================================================= */}
        {/* SECTION 4: Split Configuration */}
        {/* ============================================================= */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Split className="h-4 w-4" />
              Split Configuration
            </CardTitle>
            <CardDescription>How should this expense be divided?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Split Type Selector */}
            <div className="space-y-2">
              <Label>Split type</Label>
              <Select value={splitType} onValueChange={handleSplitTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPLIT_TYPES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {SPLIT_TYPES.find((st) => st.value === splitType)?.description}
              </p>
            </div>

            <Separator />

            {/* Dynamic Split Configuration */}
            {renderSplitConfig()}

            {/* Validation warning */}
            {selectedParticipants.length > 0 && parsedAmount > 0 && !splitValidation.valid && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{splitValidation.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================================= */}
        {/* SECTION 5: Summary */}
        {/* ============================================================= */}
        {renderSummary()}

        {/* ============================================================= */}
        {/* Submit */}
        {/* ============================================================= */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={
            isSubmitting ||
            !description.trim() ||
            parsedAmount <= 0 ||
            selectedParticipants.length === 0 ||
            !splitValidation.valid ||
            !paidBy
          }
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Expense
        </Button>
      </form>
    </div>
  );
}
