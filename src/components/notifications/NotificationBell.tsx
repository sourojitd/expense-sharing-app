'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Receipt,
  DollarSign,
  Clock,
  UserPlus,
  Users,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatRelativeTime, cn } from '@/lib/utils';

interface NotificationData {
  entityId?: string;
  [key: string]: unknown;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: NotificationData | null;
  isRead: boolean;
  priority: string;
  createdAt: string;
}

const NOTIFICATION_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  EXPENSE_ADDED: { icon: Receipt, color: 'text-blue-500' },
  PAYMENT_RECEIVED: { icon: DollarSign, color: 'text-green-500' },
  PAYMENT_REMINDER: { icon: Clock, color: 'text-orange-500' },
  FRIEND_REQUEST: { icon: UserPlus, color: 'text-purple-500' },
  GROUP_INVITE: { icon: Users, color: 'text-indigo-500' },
  SETTLEMENT_DUE: { icon: AlertCircle, color: 'text-red-500' },
  RECURRING_DUE: { icon: RefreshCw, color: 'text-yellow-500' },
  COMMENT_ADDED: { icon: MessageCircle, color: 'text-pink-500' },
  SYSTEM: { icon: Bell, color: 'text-gray-500' },
};

function getNotificationRoute(type: string, data: NotificationData | null): string | null {
  const entityId = data?.entityId;

  switch (type) {
    case 'EXPENSE_ADDED':
      return entityId ? `/expenses/${entityId}` : null;
    case 'PAYMENT_RECEIVED':
      return '/settle';
    case 'FRIEND_REQUEST':
      return '/friends';
    case 'GROUP_INVITE':
      return '/groups';
    case 'COMMENT_ADDED':
      return entityId ? `/expenses/${entityId}` : null;
    default:
      return null;
  }
}

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationBell() {
  const { tokens } = useAuth();
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const headers = tokens?.accessToken
    ? { Authorization: `Bearer ${tokens.accessToken}` }
    : undefined;

  const fetchUnreadCount = useCallback(async () => {
    if (!headers) return;

    try {
      const response = await fetch('/api/notifications/unread-count', { headers });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [tokens?.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNotifications = useCallback(async () => {
    if (!headers) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=20', { headers });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tokens?.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!headers) return;

    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers,
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!headers) return;

    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers,
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    const route = getNotificationRoute(notification.type, notification.data);
    if (route) {
      setIsOpen(false);
      router.push(route);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        <Separator />

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => {
                const iconConfig = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.SYSTEM;
                const Icon = iconConfig.icon;

                return (
                  <button
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      !notification.isRead && 'bg-muted/30'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted',
                        iconConfig.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm leading-tight',
                            !notification.isRead ? 'font-semibold' : 'font-medium'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => {
              setIsOpen(false);
              router.push('/activity');
            }}
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
