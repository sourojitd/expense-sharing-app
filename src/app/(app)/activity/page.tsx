'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/lib/hooks/use-toast';
import {
  formatRelativeTime,
  getInitials,
  formatCurrency,
  cn,
} from '@/lib/utils';
import {
  Activity as ActivityIcon,
  Receipt,
  CreditCard,
  Users,
  UserPlus,
  UserMinus,
  MessageSquare,
  UserCheck,
  Send,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityUser {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface ActivityGroup {
  id: string;
  name: string;
}

interface ActivityItem {
  id: string;
  type: string;
  userId: string;
  groupId: string | null;
  entityId: string;
  entityType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: ActivityUser;
  group: ActivityGroup | null;
}

interface FeedResponse {
  activities: ActivityItem[];
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// Activity icon and color mapping
// ---------------------------------------------------------------------------

function getActivityIcon(type: string) {
  switch (type) {
    case 'EXPENSE_CREATED':
      return Receipt;
    case 'EXPENSE_UPDATED':
      return Pencil;
    case 'EXPENSE_DELETED':
      return Trash2;
    case 'PAYMENT_RECORDED':
      return CreditCard;
    case 'PAYMENT_CONFIRMED':
      return CreditCard;
    case 'GROUP_CREATED':
      return Users;
    case 'GROUP_MEMBER_ADDED':
      return UserPlus;
    case 'GROUP_MEMBER_REMOVED':
      return UserMinus;
    case 'COMMENT_ADDED':
      return MessageSquare;
    case 'FRIEND_REQUEST_SENT':
      return Send;
    case 'FRIEND_REQUEST_ACCEPTED':
      return UserCheck;
    default:
      return ActivityIcon;
  }
}

function getActivityIconColor(type: string): string {
  switch (type) {
    case 'EXPENSE_CREATED':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
    case 'EXPENSE_UPDATED':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400';
    case 'EXPENSE_DELETED':
      return 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400';
    case 'PAYMENT_RECORDED':
    case 'PAYMENT_CONFIRMED':
      return 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400';
    case 'GROUP_CREATED':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400';
    case 'GROUP_MEMBER_ADDED':
      return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400';
    case 'GROUP_MEMBER_REMOVED':
      return 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400';
    case 'COMMENT_ADDED':
      return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400';
    case 'FRIEND_REQUEST_SENT':
    case 'FRIEND_REQUEST_ACCEPTED':
      return 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// ---------------------------------------------------------------------------
// Activity description builder
// ---------------------------------------------------------------------------

function getActivityDescription(activity: ActivityItem): string {
  const userName = activity.user.name;
  const meta = activity.metadata ?? {};

  switch (activity.type) {
    case 'EXPENSE_CREATED': {
      const description = (meta.description as string) || 'an expense';
      const amount = meta.amount as number | undefined;
      const currency = (meta.currency as string) || 'USD';
      if (amount !== undefined) {
        return `${userName} added '${description}' for ${formatCurrency(amount, currency)}`;
      }
      return `${userName} added '${description}'`;
    }
    case 'EXPENSE_UPDATED': {
      const description = (meta.description as string) || 'an expense';
      return `${userName} updated '${description}'`;
    }
    case 'EXPENSE_DELETED': {
      const description = (meta.description as string) || 'an expense';
      return `${userName} deleted '${description}'`;
    }
    case 'PAYMENT_RECORDED': {
      const amount = meta.amount as number | undefined;
      const currency = (meta.currency as string) || 'USD';
      const toUserName = (meta.toUserName as string) || 'someone';
      if (amount !== undefined) {
        return `${userName} recorded a payment of ${formatCurrency(amount, currency)} to ${toUserName}`;
      }
      return `${userName} recorded a payment to ${toUserName}`;
    }
    case 'PAYMENT_CONFIRMED': {
      const amount = meta.amount as number | undefined;
      const currency = (meta.currency as string) || 'USD';
      if (amount !== undefined) {
        return `${userName} confirmed a payment of ${formatCurrency(amount, currency)}`;
      }
      return `${userName} confirmed a payment`;
    }
    case 'GROUP_CREATED': {
      const groupName = (meta.groupName as string) || activity.group?.name || 'a group';
      return `${userName} created group '${groupName}'`;
    }
    case 'GROUP_MEMBER_ADDED': {
      const memberName = (meta.memberName as string) || 'a member';
      return `${userName} added ${memberName} to the group`;
    }
    case 'GROUP_MEMBER_REMOVED': {
      const memberName = (meta.memberName as string) || 'a member';
      return `${userName} removed ${memberName} from the group`;
    }
    case 'COMMENT_ADDED': {
      const expenseDescription = (meta.expenseDescription as string) || 'an expense';
      return `${userName} commented on '${expenseDescription}'`;
    }
    case 'FRIEND_REQUEST_SENT': {
      const receiverName = (meta.receiverName as string) || 'someone';
      return `${userName} sent a friend request to ${receiverName}`;
    }
    case 'FRIEND_REQUEST_ACCEPTED': {
      const senderName = (meta.senderName as string) || 'someone';
      return `${userName} accepted ${senderName}'s friend request`;
    }
    default:
      return `${userName} performed an action`;
  }
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function ActivitySkeleton() {
  return (
    <div className="flex gap-4 py-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity item component
// ---------------------------------------------------------------------------

function ActivityItemCard({
  activity,
  isLast,
}: {
  activity: ActivityItem;
  isLast: boolean;
}) {
  const Icon = getActivityIcon(activity.type);
  const iconColor = getActivityIconColor(activity.type);
  const description = getActivityDescription(activity);

  return (
    <div className="relative flex gap-4 py-4">
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-5 top-14 bottom-0 w-px bg-border" />
      )}

      {/* User avatar */}
      <Avatar className="h-10 w-10 shrink-0 z-10">
        {activity.user.profilePicture && (
          <AvatarImage
            src={activity.user.profilePicture}
            alt={activity.user.name}
          />
        )}
        <AvatarFallback className="text-xs font-medium">
          {getInitials(activity.user.name)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">
          {description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(activity.createdAt)}
          </span>
          {activity.group && (
            <Badge variant="secondary" className="text-xs font-normal">
              {activity.group.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Activity type icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          iconColor
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ActivityPage() {
  const { tokens, user } = useAuth();
  const { toast } = useToast();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const fetchActivities = useCallback(
    async (cursor?: string) => {
      if (!tokens?.accessToken) return;

      const isInitialLoad = !cursor;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(`/api/activity?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }

        const data: FeedResponse = await response.json();

        if (isInitialLoad) {
          setActivities(data.activities);
        } else {
          setActivities((prev) => [...prev, ...data.activities]);
        }
        setNextCursor(data.nextCursor);
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to load activity feed',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tokens?.accessToken, toast]
  );

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Apply client-side filter for "My Activity"
  const filteredActivities =
    filter === 'mine' && user
      ? activities.filter((a) => a.userId === user.id)
      : activities;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground">
            Your recent activity and updates
          </p>
        </div>

        {/* Filter tabs */}
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as 'all' | 'mine')}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">My Activity</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Activity feed */}
      <Card>
        <CardContent className="p-6">
          {/* Loading state */}
          {loading && (
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <ActivitySkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredActivities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ActivityIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No activity yet</h3>
              <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                {filter === 'mine'
                  ? 'You haven\'t performed any actions yet. Start by creating a group or adding an expense.'
                  : 'There is no activity to show yet. Start by creating a group or adding an expense.'}
              </p>
            </div>
          )}

          {/* Activity list */}
          {!loading && filteredActivities.length > 0 && (
            <>
              <div className="divide-y">
                {filteredActivities.map((activity, index) => (
                  <ActivityItemCard
                    key={activity.id}
                    activity={activity}
                    isLast={index === filteredActivities.length - 1}
                  />
                ))}
              </div>

              {/* Load more */}
              {nextCursor && filter === 'all' && (
                <>
                  <Separator className="my-4" />
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => fetchActivities(nextCursor)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
