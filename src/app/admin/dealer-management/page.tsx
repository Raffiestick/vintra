
'use client';
export const dynamic = "force-dynamic";
export const revalidate = 0;

import dynamicImport from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DealerManagementClient = dynamicImport(
  () => import('./DealerManagementClient'),
  { 
    ssr: false,
    loading: () => <DealerManagementSkeleton />
  }
);

function DealerManagementSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="border rounded-md">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-6 w-1/6" />
          <Skeleton className="h-6 w-1/6" />
          <Skeleton className="h-6 w-1/6" />
          <Skeleton className="h-6 w-1/6" />
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/6" />
            <Skeleton className="h-5 w-1/6" />
            <Skeleton className="h-5 w-1/6" />
            <Skeleton className="h-5 w-1/6" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return <DealerManagementClient />;
}
