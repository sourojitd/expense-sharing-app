import Link from 'next/link';
import { SplitLogo } from '@/components/ui/SplitLogo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background bg-grid-pattern p-4">
      <Link href="/" className="flex items-center gap-3 mb-8">
        <SplitLogo size={44} />
        <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Splito</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
