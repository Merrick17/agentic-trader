'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function AgentPage() {
  const router = useRouter();

  // Auto-redirect to dashboard after showing message
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <Card className="border-border p-8 text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Agent Moved
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          The trading agent is now accessible from the floating widget in the bottom right corner of any page.
        </p>
        <p className="text-xs text-muted-foreground">
          Redirecting to dashboard...
        </p>
      </Card>
    </div>
  );
}
