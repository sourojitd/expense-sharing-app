'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { GROUP_TYPES } from '@/lib/constants/group-types';

export default function NewGroupPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('FRIENDS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tokens } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.accessToken}`,
        },
        body: JSON.stringify({ name, description: description || undefined, type }),
      });
      if (!res.ok) throw new Error('Failed to create group');
      const data = await res.json();
      toast({ title: 'Group created!', description: 'Your new group is ready.' });
      router.push(`/groups/${data.data?.group?.id || data.group?.id}`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create group.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/groups">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to groups
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
          <CardDescription>Set up a new group to track shared expenses</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="e.g., Apartment, Trip to Goa..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Group Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
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
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this group for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
          <div className="p-6 pt-0">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
