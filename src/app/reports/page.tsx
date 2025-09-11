
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface Jacket extends DocumentData {
  id: string;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  auctionSaleDate?: Timestamp;
  itemPrice?: number;
  buyerFee?: number;
  onlineFee?: number;
  managementFee?: number;
  isAuctionPaid?: boolean;
  isMgmtFeePaid?: boolean;
  miscFees?: { amount?: number }[];
  invoiceUrl?: string;
}

function calculateOutstanding(jacket: Jacket): number {
    const num = (x: any): number => (typeof x === 'number' ? x : 0);
    const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
    const mgmtDue = num(jacket.managementFee);
    const miscTotal = jacket.miscFees?.reduce((sum, fee) => sum + num(fee.amount), 0) || 0;

    const outstanding =
        (jacket.isAuctionPaid ? 0 : auctionDue) +
        (jacket.isMgmtFeePaid ? 0 : mgmtDue) +
        miscTotal;
        
    return outstanding;
}

function ReportsSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-1/3" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>My Jackets</CardTitle>
                    <CardDescription>A list of all vehicle jackets assigned to you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-20" /></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function MyJacketsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [jackets, setJackets] = useState<Jacket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setJackets([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, "jackets"), where("dealerId", "==", user.uid));
    
    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const jacketsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          vin: data.vin || 'N/A',
          ...data,
        } as Jacket;
      });
      setJackets(jacketsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jackets: ", error);
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, [user]);

  const totalOutstanding = useMemo(() => {
    return jackets.reduce((total, jacket) => total + calculateOutstanding(jacket), 0);
  }, [jackets]);

  const fmtCurrency = (n?: number): string => {
    if (n === null || typeof n === "undefined") {
      return "$0.00";
    }
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };
  
  if (loading) {
    return <ReportsSkeleton />;
  }

  if (!user) {
    return (
        <Card className="w-full max-w-md mx-auto mt-20">
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Please sign in to view your reports.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Summary of your outstanding balances across all jackets.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                <p className="text-3xl font-bold">{fmtCurrency(totalOutstanding)}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>My Jackets</CardTitle>
                <CardDescription>
                A list of all vehicle jackets assigned to you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {jackets.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Auction Date</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {jackets.map((jacket) => {
                        const outstanding = calculateOutstanding(jacket);
                        const vehicleDesc = [jacket.year, jacket.make, jacket.model].filter(Boolean).join(' ');
                        return (
                            <TableRow key={jacket.id}>
                                <TableCell>
                                    <div className="font-medium">{vehicleDesc || "Vehicle Details Missing"}</div>
                                    <div className="text-sm text-muted-foreground font-mono">{jacket.vin}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <Badge variant={jacket.isAuctionPaid ? 'default' : 'destructive'}>
                                            Auction {jacket.isAuctionPaid ? 'Paid' : 'Unpaid'}
                                        </Badge>
                                        <Badge variant={jacket.isMgmtFeePaid ? 'default' : 'destructive'}>
                                            Mgmt {jacket.isMgmtFeePaid ? 'Paid' : 'Unpaid'}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {jacket.auctionSaleDate ? jacket.auctionSaleDate.toDate().toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {fmtCurrency(outstanding)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/jacket/preview/${jacket.id}`}>
                                                Open Details
                                            </Link>
                                        </Button>
                                        {jacket.invoiceUrl && (
                                            <Button asChild variant="secondary" size="sm">
                                                <a href={jacket.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                                    Invoice <ExternalLink className="ml-2 h-3 w-3" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
                ) : (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">You have not been assigned any jackets yet.</p>
                </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
