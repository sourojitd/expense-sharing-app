'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth.context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2, User, Shield, Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useTheme } from 'next-themes';

const currencies = [
  'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF', 'SGD',
  'AED', 'BRL', 'MXN', 'KRW', 'SEK', 'NOK', 'DKK', 'NZD', 'ZAR', 'THB',
];

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    description: 'Clean and bright interface',
    icon: Sun,
    preview: { bg: '#F8FAFC', card: '#FFFFFF', text: '#030712', accent: '#6366F1' },
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes',
    icon: Moon,
    preview: { bg: '#030712', card: '#0A0F1E', text: '#F8FAFC', accent: '#818CF8' },
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follows your device settings',
    icon: Monitor,
    preview: null,
  },
] as const;

export default function SettingsPage() {
  const { user, tokens } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    preferredCurrency: user?.preferredCurrency || 'USD',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleThemeChange = (newTheme: string) => {
    document.documentElement.classList.add('theme-transition');
    setTheme(newTheme);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 500);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens?.accessToken}` },
        body: JSON.stringify(profileData),
      });
      if (res.ok) {
        toast({ title: 'Profile updated!' });
      } else {
        const data = await res.json();
        toast({ variant: 'destructive', title: 'Error', description: data.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ variant: 'destructive', title: 'New passwords do not match' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens?.accessToken}` },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
      });
      if (res.ok) {
        toast({ title: 'Password changed!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        toast({ variant: 'destructive', title: 'Error', description: data.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle className="text-lg">Appearance</CardTitle>
          </div>
          <CardDescription>Customize the look and feel of the app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {mounted && themeOptions.map((opt) => {
              const isActive = theme === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)}
                  className={`theme-option-card relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center ${
                    isActive ? 'active border-primary' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  {/* Preview mini window */}
                  {opt.preview ? (
                    <div
                      className="w-full aspect-[4/3] rounded-lg border border-border/50 overflow-hidden"
                      style={{ backgroundColor: opt.preview.bg }}
                    >
                      <div className="h-2.5 w-full flex items-center gap-1 px-1.5" style={{ backgroundColor: opt.preview.card }}>
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                      </div>
                      <div className="p-1.5 space-y-1">
                        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: opt.preview.text, opacity: 0.2 }} />
                        <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: opt.preview.text, opacity: 0.1 }} />
                        <div className="h-2 w-full rounded" style={{ backgroundColor: opt.preview.accent, opacity: 0.8 }} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-lg border border-border/50 overflow-hidden flex">
                      {/* Half light / half dark */}
                      <div className="w-1/2 h-full" style={{ backgroundColor: '#F8FAFC' }}>
                        <div className="h-2.5 w-full flex items-center gap-0.5 px-1" style={{ backgroundColor: '#FFFFFF' }}>
                          <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                          <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                          <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                        </div>
                        <div className="p-1 space-y-0.5">
                          <div className="h-0.5 w-3/4 rounded-full bg-black/20" />
                          <div className="h-0.5 w-1/2 rounded-full bg-black/10" />
                        </div>
                      </div>
                      <div className="w-1/2 h-full" style={{ backgroundColor: '#030712' }}>
                        <div className="h-2.5 w-full flex items-center justify-end gap-0.5 px-1" style={{ backgroundColor: '#0A0F1E' }}>
                          <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                          <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                          <div className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                        </div>
                        <div className="p-1 space-y-0.5">
                          <div className="h-0.5 w-3/4 rounded-full bg-white/20" />
                          <div className="h-0.5 w-1/2 rounded-full bg-white/10" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>

                  {isActive && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle className="text-lg">Profile</CardTitle>
          </div>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileUpdate}>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback className="text-lg">{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={profileData.name} onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={profileData.phone} onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Currency</Label>
                <Select value={profileData.preferredCurrency} onValueChange={(v) => setProfileData((p) => ({ ...p, preferredCurrency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-lg">Security</CardTitle>
          </div>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))} required />
              </div>
            </div>
            <Button type="submit" variant="outline" disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
