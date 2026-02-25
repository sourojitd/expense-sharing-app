'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Users,
  Receipt,
  PieChart,
  HandCoins,
  ArrowRight,
  Zap,
  Shield,
} from 'lucide-react';
import { SplitLogo } from '@/components/ui/SplitLogo';

const features = [
  {
    icon: Receipt,
    title: 'Smart Bill Splitting',
    description: 'Split equally, by percentage, shares, or item-wise. Every split method you need.',
  },
  {
    icon: Users,
    title: 'Group Expenses',
    description: 'Create groups for trips, roommates, or any shared spending. Track who owes what.',
  },
  {
    icon: HandCoins,
    title: 'Easy Settlements',
    description: 'Simplify debts with one tap. Minimize the number of payments needed to settle up.',
  },
  {
    icon: PieChart,
    title: 'Spending Analytics',
    description: 'Visual charts and insights into your spending patterns by category and over time.',
  },
  {
    icon: Zap,
    title: 'Real-time Updates',
    description: 'See expenses and settlements as they happen. Stay in sync with your group.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your financial data is encrypted and secure. We never share your information.',
  },
];

const steps = [
  { step: '1', title: 'Create a Group', description: 'Add friends, roommates, or travel buddies to a shared group.' },
  { step: '2', title: 'Add Expenses', description: 'Log expenses and choose how to split them among group members.' },
  { step: '3', title: 'Settle Up', description: 'See simplified balances and settle debts with minimal transactions.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <SplitLogo size={36} />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Splito</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient">
        <div className="container mx-auto px-4 py-20 md:py-32 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
              <Zap className="mr-2 h-3.5 w-3.5 text-primary" />
              The smartest way to split expenses
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Split Expenses,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500">
                Not Friendships
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              Track shared expenses, split bills effortlessly, and settle up with friends.
              No more awkward money conversations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="xl" asChild>
                <Link href="/register">
                  Start for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/login">Sign in to your account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Everything you need to split expenses</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Packed with features that make managing shared expenses a breeze.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/20 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-3">How it works</h2>
          <p className="text-muted-foreground text-lg">Three simple steps to stress-free expense sharing</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          {steps.map((item) => (
            <div key={item.step} className="text-center space-y-4 group">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xl font-bold shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-110">
                {item.step}
              </div>
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/10 p-8 md:p-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to stop chasing payments?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join thousands of users who split expenses effortlessly with Splito.
          </p>
          <Button size="xl" asChild>
            <Link href="/register">
              Get Started — It&apos;s Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SplitLogo size={24} animated={false} />
            <span className="font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Splito</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Splito. Split expenses, not friendships.
          </p>
        </div>
      </footer>
    </div>
  );
}
