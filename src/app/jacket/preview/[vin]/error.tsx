"use client";

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-destructive">
                    Something Went Wrong
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p>We had a hiccup loading this jacket.</p>
                <p className="text-xs text-muted-foreground font-mono p-2 bg-muted rounded-md">
                    {error.message}
                </p>
                <Button onClick={() => reset()}>
                    Try again
                </Button>
            </CardContent>
        </Card>
    </main>
  );
}

    
