
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, onSnapshot, DocumentData, Timestamp, orderBy } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  dealerId?: string;
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

function AdminJacketsSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(6)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-20" /></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AdminAllJacketsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [allJackets, setAllJackets] = useState<Jacket[]>([]);
  const [loadingJackets, setLoadingJackets] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      if (!authLoading) setLoadingJackets(false);
      return;
    };

    setLoadingJackets(true);
    const q = query(collection(db, "jackets"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const jacketsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Jacket));
      setAllJackets(jacketsData);
      setLoadingJackets(false);
    }, (error) => {
      console.error("Error fetching all jackets: ", error);
      setLoadingJackets(false);
    });

    return () => unsubscribe();
  }, [isAdmin, authLoading]);

  const filteredJackets = useMemo(() => {
    return allJackets.filter(jacket => {
      const vinMatch = jacket.vin.toLowerCase().includes(searchTerm.toLowerCase());
      const unpaidMatch = !showUnpaidOnly || calculateOutstanding(jacket) > 0;
      return vinMatch && unpaidMatch;
    });
  }, [allJackets, searchTerm, showUnpaidOnly]);
  
  const fmtCurrency = (n?: number): string => {
    if (n === null || typeof n === "undefined") {
      return "$0.00";
    }
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  if (authLoading || loadingJackets) {
    return <AdminJacketsSkeleton />;
  }

  if (!isAdmin) {
    return (
        <Card className="w-full max-w-md mx-auto mt-20">
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You must be an admin to view this page.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>All Jackets</CardTitle>
                <CardDescription>
                A list of all vehicle jackets in the system.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-4">
                    <Input 
                        placeholder="Search by VIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="show-unpaid"
                            checked={showUnpaidOnly}
                            onCheckedChange={(checked) => setShowUnpaidOnly(!!checked)}
                        />
                        <Label htmlFor="show-unpaid">Show unpaid only</Label>
                    </div>
                </div>

                {filteredJackets.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Dealer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Auction Date</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredJackets.map((jacket) => {
                        const outstanding = calculateOutstanding(jacket);
                        const vehicleDesc = [jacket.year, jacket.make, jacket.model].filter(Boolean).join(' ');
                        return (
                            <TableRow key={jacket.id}>
                                <TableCell>
                                    <div className="font-medium">{vehicleDesc || "Vehicle Details Missing"}</div>
                                    <div className="text-sm text-muted-foreground font-mono">{jacket.vin}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs truncate max-w-[150px] font-mono" title={jacket.dealerId || 'N/A'}>
                                        {jacket.dealerId || "Not Assigned"}
                                    </div>
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
                                                Open
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
                    <p className="text-muted-foreground">No jackets found matching your criteria.</p>
                </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
