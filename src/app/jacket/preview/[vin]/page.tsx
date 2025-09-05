
"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { httpsCallableClient } from "@/lib/firebase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Jacket {
  vin: string;
  year: number;
  make: string;
  model: string;
  color: string;
  odometer: number;
  titleState: string;
  titleNumber: string;
  auctionInvoiceTotal: number;
  dealerId: string;
  jacketId: string;
  createdAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  [key: string]: any;
}

function JacketDetailSkeleton() {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div className="md:col-span-3 border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Vehicle Information</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><strong className="block text-muted-foreground">Color:</strong> <Skeleton className="h-5 w-20 mt-1"/></div>
              <div><strong className="block text-muted-foreground">Odometer:</strong> <Skeleton className="h-5 w-24 mt-1"/></div>
              <div><strong className="block text-muted-foreground">Title State:</strong> <Skeleton className="h-5 w-16 mt-1"/></div>
              <div><strong className="block text-muted-foreground">Title Number:</strong> <Skeleton className="h-5 w-28 mt-1"/></div>
          </div>
        </div>
         <div className="md:col-span-3 border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Financials & Assignment</h4>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><strong className="block text-muted-foreground">Auction Total:</strong> <Skeleton className="h-5 w-24 mt-1"/></div>
              <div className="col-span-2"><strong className="block text-muted-foreground">Assigned Dealer ID:</strong> <Skeleton className="h-5 w-48 mt-1"/></div>
           </div>
        </div>
        <div className="md:col-span-3 border-t pt-6">
           <div className="text-xs text-muted-foreground">
              Created on: <Skeleton className="h-4 w-24 inline-block"/>
           </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
          <Button size="lg" className="w-full md:w-auto" disabled>Process Jacket</Button>
      </CardFooter>
     </Card>
  )
}

export default function JacketDetailPage() {
  const params = useParams();
  const vin = Array.isArray(params.vin) ? params.vin[0] : params.vin;
  const [jacket, setJacket] = useState<Jacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vin) return;

    const fetchJacket = async () => {
      setLoading(true);
      try {
        const getJacketByVin = await httpsCallableClient<{ vin: string }, Jacket>("getJacketByVin");
        const result = await getJacketByVin({ vin });
        if (result.data) {
          setJacket(result.data);
        } else {
          setError("Jacket not found.");
        }
      } catch (err: any) {
        console.error("Error fetching jacket:", err);
        setError(err.message || "Failed to fetch jacket data.");
      } finally {
        setLoading(false);
      }
    };

    fetchJacket();
  }, [vin]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8">
        <JacketDetailSkeleton />
      </main>
    );
  }

  if (error || !jacket) {
     return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-4xl">
           <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">Jacket Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No vehicle jacket was found with the VIN:{" "}
              <span className="font-mono">{vin}</span>.
            </p>
            {error && <p className="text-destructive mt-2">{error}</p>}
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const createdAt = jacket.createdAt?._seconds 
    ? new Date(jacket.createdAt._seconds * 1000).toLocaleDateString() 
    : 'N/A';

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8">
       <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">
                {jacket.year} {jacket.make} {jacket.model}
              </CardTitle>
              <CardDescription>
                VIN: <span className="font-mono">{jacket.vin}</span>
              </CardDescription>
            </div>
             <Badge variant="secondary" className="text-lg">
                Jacket ID: {jacket.jacketId}
             </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="md:col-span-3 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">Vehicle Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><strong className="block text-muted-foreground">Color:</strong> {jacket.color}</div>
                <div><strong className="block text-muted-foreground">Odometer:</strong> {jacket.odometer.toLocaleString()}</div>
                <div><strong className="block text-muted-foreground">Title State:</strong> {jacket.titleState}</div>
                <div><strong className="block text-muted-foreground">Title Number:</strong> {jacket.titleNumber}</div>
            </div>
          </div>

           <div className="md:col-span-3 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">Financials & Assignment</h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><strong className="block text-muted-foreground">Auction Total:</strong> ${jacket.auctionInvoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="col-span-2"><strong className="block text-muted-foreground">Assigned Dealer ID:</strong> <span className="font-mono text-xs">{jacket.dealerId}</span></div>
             </div>
          </div>
          <div className="md:col-span-3 border-t pt-6">
             <div className="text-xs text-muted-foreground">
                Created on: {createdAt}
             </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
            <Button size="lg" className="w-full md:w-auto">Process Jacket</Button>
        </CardFooter>
       </Card>
    </main>
  );
}
