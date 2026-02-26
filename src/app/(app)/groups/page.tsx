'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { getGroupTypeConfig } from '@/lib/constants/group-types';

interface Group {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  type: string;
  createdBy: string;
  _count?: { members: number; expenses: number };
}

export default function GroupsPage() {
  const { tokens } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
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
        setLoading(false);
      }
    }
    if (tokens) fetchGroups();
  }, [tokens]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">Manage your shared expense groups</p>
        </div>
        <Button asChild>
          <Link href="/groups/new">
            <Plus className="mr-2 h-4 w-4" />
            New Group
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No groups yet</h3>
            <p className="text-muted-foreground mb-4">Create your first group to start splitting expenses</p>
            <Button asChild>
              <Link href="/groups/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const typeConfig = getGroupTypeConfig(group.type || 'FRIENDS');
            const TypeIcon = typeConfig.icon;

            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(group.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{group.name}</CardTitle>
                          {group.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex gap-2">
                    <Badge variant="outline" className={cn('text-xs', typeConfig.badgeColor)}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {typeConfig.label}
                    </Badge>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {group._count?.members || '?'} members
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
