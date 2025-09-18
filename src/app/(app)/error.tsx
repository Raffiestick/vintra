'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-destructive">
                    Something Went Wrong
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p>An unexpected error occurred in this part of the application.</p>
                <p className="text-xs text-muted-foreground font-mono p-2 bg-muted rounded-md">
                    {error.message}
                </p>
                <Button onClick={() => reset()}>
                    Try again
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
