import { Wallet } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background bg-grid-pattern p-4">
      <Link href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg group-hover:shadow-primary/25 transition-shadow">
          <Wallet className="w-6 h-6" />
        </div>
        <span className="font-bold text-2xl tracking-tight">Splito</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
