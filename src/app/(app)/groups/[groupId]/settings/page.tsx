'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth.context';
import { useToast } from '@/lib/hooks/use-toast';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
  Save,
  Loader2,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  Search,
  LogOut,
  Trash2,
  AlertTriangle,
  Crown,
  Users,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { GROUP_TYPES } from '@/lib/constants/group-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  type: string;
  createdBy: string;
  members: GroupMember[];
  expenses: Array<{ id: string }>;
}

interface Friend {
  id: string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function GroupSettingsPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const { tokens, user } = useAuth();
  const { toast } = useToast();

  // Group data
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit group form
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState('FRIENDS');
  const [saving, setSaving] = useState(false);

  // Friends for invite
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [addingMember, setAddingMember] = useState<string | null>(null);

  // Action loading states
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [promotingMember, setPromotingMember] = useState<string | null>(null);

  // Dialog states
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Derived values
  const isCreator = group?.createdBy === user?.id;
  const currentMember = group?.members.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'admin';
  const canManageMembers = isCreator || isAdmin;

  // ---------------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------------

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const g = data.data?.group || data.group;
        setGroup(g);
        setEditName(g.name || '');
        setEditDescription(g.description || '');
        setEditType(g.type || 'FRIENDS');
      } else {
        toast({ variant: 'destructive', title: 'Failed to load group' });
      }
    } catch (e) {
      console.error('Failed to fetch group', e);
      toast({ variant: 'destructive', title: 'Failed to load group' });
    } finally {
      setLoading(false);
    }
  }, [groupId, tokens, toast]);

  const fetchFriends = useCallback(async () => {
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
    }
  }, [tokens]);

  useEffect(() => {
    if (tokens && groupId) {
      fetchGroup();
      fetchFriends();
    }
  }, [tokens, groupId, fetchGroup, fetchFriends]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSaveGroup = async () => {
    if (!editName.trim()) {
      toast({ variant: 'destructive', title: 'Group name is required' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.accessToken}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          type: editType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedGroup = data.data?.group || data.group;
        if (updatedGroup) {
          setGroup((prev) => (prev ? { ...prev, ...updatedGroup } : prev));
        }
        toast({ title: 'Group updated', description: 'Group details have been saved.' });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Failed to update group',
          description: err.error || 'Something went wrong.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update group' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (friendId: string) => {
    setAddingMember(friendId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.accessToken}`,
        },
        body: JSON.stringify({ userId: friendId }),
      });

      if (res.ok) {
        toast({ title: 'Member added', description: 'The member has been added to the group.' });
        fetchGroup();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Failed to add member',
          description: err.error || 'Something went wrong.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to add member' });
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMember(memberId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });

      if (res.ok) {
        toast({ title: 'Member removed', description: 'The member has been removed from the group.' });
        fetchGroup();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Failed to remove member',
          description: err.error || 'Something went wrong.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to remove member' });
    } finally {
      setRemovingMember(null);
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    setPromotingMember(memberId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.accessToken}`,
        },
        body: JSON.stringify({ role: 'admin' }),
      });

      if (res.ok) {
        toast({ title: 'Member promoted', description: 'The member is now an admin.' });
        fetchGroup();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Failed to promote member',
          description: err.error || 'Something went wrong.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to promote member' });
    } finally {
      setPromotingMember(null);
    }
  };

  const handleLeaveGroup = async () => {
    setLeavingGroup(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });

      if (res.ok) {
        toast({ title: 'Left group', description: 'You have left the group.' });
        router.push('/groups');
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Failed to leave group',
          description: err.error || 'Something went wrong.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to leave group' });
    } finally {
      setLeavingGroup(false);
      setLeaveDialogOpen(false);
    }
  };

  const handleDeleteGroup = async () => {
    setDeletingGroup(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });

      if (res.ok) {
        toast({ title: 'Group deleted', description: 'The group has been permanently deleted.' });
        router.push('/groups');
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Failed to delete group',
          description: err.error || 'Something went wrong.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete group' });
    } finally {
      setDeletingGroup(false);
      setDeleteDialogOpen(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived data for invite section
  // ---------------------------------------------------------------------------

  const memberUserIds = new Set(group?.members.map((m) => m.userId) || []);
  const availableFriends = friends.filter((f) => !memberUserIds.has(f.id));
  const filteredFriends = friendSearch.trim()
    ? availableFriends.filter(
        (f) =>
          f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
          f.email.toLowerCase().includes(friendSearch.toLowerCase())
      )
    : availableFriends;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Group not found</h2>
        <p className="text-muted-foreground mt-2">
          The group you are looking for does not exist or you do not have access.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/groups">Back to Groups</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/groups/${groupId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Group Settings</h1>
          <p className="text-muted-foreground text-sm">{group.name}</p>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Edit Group Section                                                   */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Group</CardTitle>
          <CardDescription>Update your group name and description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">
              Description{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="group-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What is this group for?"
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-type">Group Type</Label>
            <Select value={editType} onValueChange={setEditType}>
              <SelectTrigger id="group-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_TYPES.map((gt) => {
                  const Icon = gt.icon;
                  return (
                    <SelectItem key={gt.value} value={gt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {gt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveGroup} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Members Management Section                                           */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Members</CardTitle>
              <CardDescription>
                {group.members.length} member{group.members.length !== 1 ? 's' : ''} in this group
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {group.members.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {group.members.map((member) => {
              const isSelf = member.userId === user?.id;
              const isMemberCreator = member.userId === group.createdBy;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {member.user.name}
                        {isSelf && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </p>
                      {isMemberCreator && (
                        <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role === 'admin' ? (
                        <>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        'Member'
                      )}
                    </Badge>

                    {/* Promote button - show for non-admin members when current user can manage */}
                    {canManageMembers && !isSelf && member.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handlePromoteMember(member.id)}
                        disabled={promotingMember === member.id}
                        title="Promote to Admin"
                      >
                        {promotingMember === member.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}

                    {/* Remove button - show for non-creator members when current user can manage */}
                    {canManageMembers && !isSelf && !isMemberCreator && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMember === member.id}
                        title="Remove Member"
                      >
                        {removingMember === member.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Invite Members Section                                               */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite Members</CardTitle>
          <CardDescription>
            Add friends to this group. Only your friends can be added.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends by name or email..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {availableFriends.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <UserPlus className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No friends to add</p>
              <p className="text-xs text-muted-foreground mt-1">
                All your friends are already in this group, or you have no friends yet.
              </p>
              <Button size="sm" variant="outline" className="mt-3" asChild>
                <Link href="/friends">Find Friends</Link>
              </Button>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No friends match your search.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(friend.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddMember(friend.id)}
                    disabled={addingMember === friend.id}
                  >
                    {addingMember === friend.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Danger Zone                                                          */}
      {/* ------------------------------------------------------------------- */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg text-red-600 dark:text-red-400">
              Danger Zone
            </CardTitle>
          </div>
          <CardDescription>
            These actions are irreversible. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Leave Group */}
          <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900/50 p-4">
            <div>
              <p className="text-sm font-medium">Leave Group</p>
              <p className="text-xs text-muted-foreground">
                Remove yourself from this group. You will lose access to all group data.
              </p>
            </div>
            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 shrink-0 ml-4"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Leave Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Leave Group
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to leave <strong>{group.name}</strong>? You will
                    lose access to all expenses and balances in this group. This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setLeaveDialogOpen(false)}
                    disabled={leavingGroup}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleLeaveGroup}
                    disabled={leavingGroup}
                  >
                    {leavingGroup ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Group
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Delete Group - only for creator */}
          {isCreator && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900/50 p-4 bg-red-50/50 dark:bg-red-900/10">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Delete Group
                </p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this group and all associated expenses. This cannot be
                  undone.
                </p>
              </div>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0 ml-4"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5 text-red-500" />
                      Delete Group
                    </DialogTitle>
                    <DialogDescription>
                      Are you sure you want to permanently delete{' '}
                      <strong>{group.name}</strong>? This will remove all expenses,
                      balances, and member data. This action is permanent and cannot be
                      undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={deletingGroup}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteGroup}
                      disabled={deletingGroup}
                    >
                      {deletingGroup ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
