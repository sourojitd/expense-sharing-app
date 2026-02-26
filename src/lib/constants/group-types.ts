import {
  Home,
  Plane,
  Heart,
  Briefcase,
  Users,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export interface GroupTypeConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  badgeColor: string;
}

export const GROUP_TYPES: GroupTypeConfig[] = [
  {
    value: 'HOME',
    label: 'Home',
    icon: Home,
    badgeColor:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  {
    value: 'TRIP',
    label: 'Trip',
    icon: Plane,
    badgeColor:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  {
    value: 'COUPLE',
    label: 'Couple',
    icon: Heart,
    badgeColor:
      'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
  },
  {
    value: 'BUSINESS',
    label: 'Business',
    icon: Briefcase,
    badgeColor:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800',
  },
  {
    value: 'FRIENDS',
    label: 'Friends',
    icon: Users,
    badgeColor:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  {
    value: 'OTHER',
    label: 'Other',
    icon: MoreHorizontal,
    badgeColor:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
  },
];

export function getGroupTypeConfig(type: string): GroupTypeConfig {
  return (
    GROUP_TYPES.find((t) => t.value === type) ||
    GROUP_TYPES[GROUP_TYPES.length - 1]
  );
}
