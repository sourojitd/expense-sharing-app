'use client';

import { useEffect, useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth.context';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageCircle,
  Receipt,
  Banknote,
  Info,
  ChevronUp,
} from 'lucide-react';
import { formatRelativeTime, getInitials, cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageUser {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface Message {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  type: 'TEXT' | 'SYSTEM' | 'EXPENSE' | 'PAYMENT';
  createdAt: string;
  user: MessageUser;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="h-9 w-9 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-16 w-52 rounded-2xl" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <div className="space-y-1 flex flex-col items-end">
            <Skeleton className="h-12 w-44 rounded-2xl" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-36 rounded-2xl" />
          </div>
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-6 w-48 rounded-full" />
        </div>
        <div className="flex gap-2 justify-end">
          <div className="space-y-1 flex flex-col items-end">
            <Skeleton className="h-14 w-56 rounded-2xl" />
          </div>
        </div>
      </div>
      {/* Input skeleton */}
      <div className="border-t px-4 py-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// System Message
// ---------------------------------------------------------------------------

function SystemMessage({ message }: { message: Message }) {
  const icon = message.type === 'EXPENSE'
    ? <Receipt className="h-3.5 w-3.5" />
    : message.type === 'PAYMENT'
      ? <Banknote className="h-3.5 w-3.5" />
      : <Info className="h-3.5 w-3.5" />;

  const bgClass = message.type === 'EXPENSE'
    ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-300'
    : message.type === 'PAYMENT'
      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800/40 dark:text-green-300'
      : 'bg-muted/50 border-border text-muted-foreground';

  return (
    <div className="flex justify-center my-3">
      <div className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
        bgClass
      )}>
        {icon}
        <span>{message.content}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Bubble
// ---------------------------------------------------------------------------

function ChatBubble({
  message,
  isOwn,
  showSender,
  showAvatar,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  showAvatar: boolean;
}) {
  return (
    <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
      {/* Avatar for others */}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.user.profilePicture || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(message.user.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
      )}

      <div className={cn('max-w-[75%] min-w-0', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name */}
        {!isOwn && showSender && (
          <p className="text-xs font-medium text-muted-foreground mb-0.5 ml-1">
            {message.user.name}
          </p>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <p className={cn(
          'text-[10px] text-muted-foreground mt-0.5',
          isOwn ? 'text-right mr-1' : 'ml-1'
        )}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function GroupChatPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const { tokens, user } = useAuth();
  const { toast } = useToast();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState('');

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialLoad = useRef(true);

  // ------------------------------------------------------------------
  // Scroll helpers
  // ------------------------------------------------------------------
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // ------------------------------------------------------------------
  // Fetch group name
  // ------------------------------------------------------------------
  const fetchGroupName = useCallback(async () => {
    if (!tokens || !groupId) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const group = data.data?.group || data.group;
        setGroupName(group?.name || 'Chat');
      }
    } catch {
      // Silently fail, header will just say "Chat"
    }
  }, [tokens, groupId]);

  // ------------------------------------------------------------------
  // Fetch messages
  // ------------------------------------------------------------------
  const fetchMessages = useCallback(async (cursor?: string) => {
    if (!tokens || !groupId) return;

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/groups/${groupId}/messages?${params}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load messages');
      }

      const data = await res.json();
      return {
        messages: (data.messages || []) as Message[],
        nextCursor: data.nextCursor as string | undefined,
      };
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load messages',
      });
      return null;
    }
  }, [tokens, groupId, toast]);

  // ------------------------------------------------------------------
  // Initial load
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!tokens || !groupId) return;

    const init = async () => {
      setLoading(true);
      await fetchGroupName();
      const result = await fetchMessages();
      if (result) {
        // Messages come back newest-first; reverse so oldest is at the top
        setMessages(result.messages.reverse());
        setNextCursor(result.nextCursor);
      }
      setLoading(false);
      isInitialLoad.current = true;
    };

    init();
  }, [tokens, groupId, fetchGroupName, fetchMessages]);

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loading && isInitialLoad.current && messages.length > 0) {
      // Use a small delay to allow the DOM to render
      const timer = setTimeout(() => {
        scrollToBottom('instant');
        isInitialLoad.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, messages.length, scrollToBottom]);

  // ------------------------------------------------------------------
  // Load earlier messages
  // ------------------------------------------------------------------
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    // Capture current scroll position
    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;

    const result = await fetchMessages(nextCursor);
    if (result) {
      // Prepend older messages (they come newest-first, so reverse them)
      setMessages((prev) => [...result.messages.reverse(), ...prev]);
      setNextCursor(result.nextCursor);

      // Preserve scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - previousScrollHeight;
        }
      });
    }

    setLoadingMore(false);
  };

  // ------------------------------------------------------------------
  // Send message
  // ------------------------------------------------------------------
  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sending || !tokens || !groupId) return;

    setSending(true);
    setInputValue('');

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }

      const data = await res.json();
      const newMessage = data.data as Message;
      setMessages((prev) => [...prev, newMessage]);

      // Scroll to bottom after sending
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      // Restore the message if sending failed
      setInputValue(content);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send message',
      });
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // ------------------------------------------------------------------
  // Keyboard handler
  // ------------------------------------------------------------------
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ------------------------------------------------------------------
  // Determine message grouping (consecutive messages from same sender)
  // ------------------------------------------------------------------
  const shouldShowSender = (index: number): boolean => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (prev.type === 'SYSTEM' || prev.type === 'EXPENSE' || prev.type === 'PAYMENT') return true;
    return prev.userId !== curr.userId;
  };

  const shouldShowAvatar = (index: number): boolean => {
    // Show avatar for the last message in a consecutive group from the same sender
    if (index === messages.length - 1) return true;
    const next = messages[index + 1];
    const curr = messages[index];
    if (next.type === 'SYSTEM' || next.type === 'EXPENSE' || next.type === 'PAYMENT') return true;
    return next.userId !== curr.userId;
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (loading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push(`/groups/${groupId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate">Chat</h1>
          {groupName && (
            <p className="text-xs text-muted-foreground truncate">{groupName}</p>
          )}
        </div>
      </div>

      {/* Chat messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
        {/* Load more button */}
        {nextCursor && (
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-muted-foreground"
            >
              {loadingMore ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
              )}
              Load earlier messages
            </Button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">No messages yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Say hello! Start a conversation with your group members.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-1">
          {messages.map((msg, index) => {
            // System / Expense / Payment messages are centered
            if (msg.type === 'SYSTEM' || msg.type === 'EXPENSE' || msg.type === 'PAYMENT') {
              return <SystemMessage key={msg.id} message={msg} />;
            }

            const isOwn = msg.userId === user?.id;
            return (
              <ChatBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showSender={!isOwn && shouldShowSender(index)}
                showAvatar={!isOwn && shouldShowAvatar(index)}
              />
            );
          })}
        </div>

        {/* Bottom anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="border-t px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 ml-1">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
