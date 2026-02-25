import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center py-12 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <FileQuestion className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">
            Page not found
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            The page you are looking for does not exist or has been moved.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
