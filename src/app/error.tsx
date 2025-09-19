'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-4 text-white">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900 text-center">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="mt-4 text-3xl font-manrope">Application Error</CardTitle>
              <CardDescription className="text-zinc-400">
                Sorry, something went wrong.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500">
                An unexpected error occurred. You can try to reload the page or return home.
              </p>
              <details className="text-left text-xs">
                <summary className="cursor-pointer text-muted-foreground">Error Details</summary>
                <p className="mt-2 font-mono bg-muted/50 p-2 rounded-md text-destructive">
                    {error?.message || 'No error message available.'}
                </p>
              </details>
            </CardContent>
            <CardContent className="flex justify-center gap-4">
               <Button onClick={() => reset()}>
                Try Again
              </Button>
               <Button variant="outline" asChild>
                <a href="/">Return to Home</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
