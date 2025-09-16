'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-4 text-white">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <AlertTriangle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4 text-3xl font-manrope">Page Not Found</CardTitle>
          <CardDescription className="text-zinc-400">
            Sorry, we couldn’t find the page you’re looking for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            The link may be broken, or the page may have been moved. Let's get you back on track.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
