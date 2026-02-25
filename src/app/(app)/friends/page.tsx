'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/lib/hooks/use-toast';
import { UserPlus, Search, Check, X, Users, Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface Friend {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
}

interface FriendRequest {
  id: string;
  sender: Friend;
  receiver: Friend;
  status: string;
  createdAt: string;
}

export default function FriendsPage() {
  const { tokens, user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; friendshipStatus: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          fetch('/api/friends', { headers: { Authorization: `Bearer ${tokens?.accessToken}` } }),
          fetch('/api/friends/requests', { headers: { Authorization: `Bearer ${tokens?.accessToken}` } }),
        ]);
        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriends(data.data?.friends || data.friends || []);
        }
        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setRequests(data.data?.requests || data.requests || []);
        }
      } catch (e) {
        console.error('Failed to fetch friends data', e);
      } finally {
        setLoading(false);
      }
    }
    if (tokens) fetchData();
  }, [tokens]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/friends/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data?.users || data.users || []);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    setSendingRequest(receiverId);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens?.accessToken}` },
        body: JSON.stringify({ receiverId }),
      });
      if (res.ok) {
        toast({ title: 'Friend request sent!' });
        setSearchResults((prev) => prev.map((u) => u.id === receiverId ? { ...u, friendshipStatus: 'pending_sent' } : u));
      } else {
        const data = await res.json();
        toast({ variant: 'destructive', title: 'Error', description: data.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to send request' });
    } finally {
      setSendingRequest(null);
    }
  };

  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens?.accessToken}` },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast({ title: action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected' });
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (action === 'accept') {
          // Refresh friends list
          const friendsRes = await fetch('/api/friends', { headers: { Authorization: `Bearer ${tokens?.accessToken}` } });
          if (friendsRes.ok) {
            const data = await friendsRes.json();
            setFriends(data.data?.friends || data.friends || []);
          }
        }
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to respond to request' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
        <p className="text-muted-foreground">Manage your friends and connections</p>
      </div>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {requests.length > 0 && <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{requests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="search">Find Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : friends.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No friends yet. Search and add some!</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar><AvatarFallback>{getInitials(friend.name)}</AvatarFallback></Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">{friend.email}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {requests.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <p className="text-muted-foreground">No pending friend requests</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar><AvatarFallback>{getInitials(request.sender.name)}</AvatarFallback></Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{request.sender.name}</p>
                      <p className="text-xs text-muted-foreground">{request.sender.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondToRequest(request.id, 'accept')}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respondToRequest(request.id, 'reject')}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.filter((u) => u.id !== user?.id).map((result) => (
                <Card key={result.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar><AvatarFallback>{getInitials(result.name)}</AvatarFallback></Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{result.name}</p>
                      <p className="text-xs text-muted-foreground">{result.email}</p>
                    </div>
                    {result.friendshipStatus === 'friend' ? (
                      <Badge variant="secondary">Friends</Badge>
                    ) : result.friendshipStatus === 'pending_sent' ? (
                      <Badge variant="outline">Request Sent</Badge>
                    ) : result.friendshipStatus === 'pending_received' ? (
                      <Badge variant="outline">Pending</Badge>
                    ) : (
                      <Button size="sm" onClick={() => sendFriendRequest(result.id)} disabled={sendingRequest === result.id}>
                        {sendingRequest === result.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                        Add
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
