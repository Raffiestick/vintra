"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, Timestamp, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 10;

interface Jacket extends DocumentData {
    id: string;
    vin: string;
    year?: number;
    make?: string;
    model?: string;
    createdAt?: Timestamp;
    auctionSaleDate?: Timestamp;
    itemPrice?: number;
    buyerFee?: number;
    onlineFee?: number;
    managementFee?: number;
    isAuctionPaid?: boolean;
    isMgmtPaid?: boolean; // legacy
    isMgmtFeePaid?: boolean;
    miscFees?: { amount?: number }[];
}

interface DealerProfile {
    companyName?: string;
    contactName?: string;
    displayName?: string;
    email?: string;
}

const num = (x: any): number => (typeof x === 'number' ? x : 0);

const calculateFinancials = (jacket: Jacket) => {
    const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
    const mgmtDue = num(jacket.managementFee);
    const miscTotal = jacket.miscFees?.reduce((s, f) => s + num(f?.amount), 0) || 0;
    const subtotal = auctionDue + mgmtDue + miscTotal;
    const isMgmtActuallyPaid = jacket.isMgmtFeePaid ?? jacket.isMgmtPaid ?? false;
    const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtActuallyPaid ? mgmtDue : 0);
    const outstanding = Math.max(0, subtotal - amountPaid);
    const isFullyPaid = jacket.isAuctionPaid && isMgmtActuallyPaid;
    return { amountPaid, outstanding, isFullyPaid };
};


function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-3/4" /></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-10 w-1/2" /></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>{[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


export default function DealerDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<DealerProfile | null>(null);
    const [jackets, setJackets] = useState<Jacket[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const profileDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (profileDoc.exists()) {
                    setProfile(profileDoc.data() as DealerProfile);
                }
            } else {
                router.push("/");
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const q = query(
            collection(db, "jackets"),
            where("dealerId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const jacketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Jacket));
            setJackets(jacketsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching jackets:", err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const metrics = useMemo(() => {
        if (jackets.length === 0) {
            return { unitsPurchased: 0, totalAmountPaid: 0, totalAmountOwed: 0 };
        }
        return jackets.reduce((acc, jacket) => {
            const { amountPaid, outstanding } = calculateFinancials(jacket);
            return {
                unitsPurchased: acc.unitsPurchased + (jacket.isAuctionPaid ? 1 : 0),
                totalAmountPaid: acc.totalAmountPaid + amountPaid,
                totalAmountOwed: acc.totalAmountOwed + outstanding,
            };
        }, { unitsPurchased: 0, totalAmountPaid: 0, totalAmountOwed: 0 });
    }, [jackets]);
    
    const filteredJackets = useMemo(() => {
        if (!searchTerm) return jackets;
        const lowercasedFilter = searchTerm.toLowerCase();
        return jackets.filter(j => 
            j.vin.toLowerCase().includes(lowercasedFilter) ||
            j.make?.toLowerCase().includes(lowercasedFilter) ||
            j.model?.toLowerCase().includes(lowercasedFilter) ||
            j.year?.toString().includes(lowercasedFilter)
        );
    }, [jackets, searchTerm]);

    const paginatedJackets = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredJackets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredJackets, currentPage]);

    const totalPages = Math.ceil(filteredJackets.length / ITEMS_PER_PAGE);

    const fmtCurrency = (n?: number) => (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

    if (loading) {
        return <DashboardSkeleton />;
    }
    
    const welcomeName = profile?.companyName || profile?.contactName || profile?.displayName || user?.email || 'Dealer';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome, {welcomeName}</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader><CardTitle>Units Purchased</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{metrics.unitsPurchased}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Amount Paid</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{fmtCurrency(metrics.totalAmountPaid)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Amount Owed</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{fmtCurrency(metrics.totalAmountOwed)}</p></CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <Input 
                        placeholder="Search by VIN, Make, Model, or Year..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="max-w-sm"
                    />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Auction Date</TableHead>
                                <TableHead>VIN</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedJackets.length > 0 ? (
                                paginatedJackets.map(jacket => {
                                    const { isFullyPaid } = calculateFinancials(jacket);
                                    const vehicleDesc = [jacket.year, jacket.make, jacket.model].filter(Boolean).join(' ');
                                    return (
                                        <TableRow key={jacket.id}>
                                            <TableCell>{jacket.auctionSaleDate ? jacket.auctionSaleDate.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell className="font-mono">{jacket.vin}</TableCell>
                                            <TableCell>{vehicleDesc || 'Details Missing'}</TableCell>
                                            <TableCell>
                                                <Badge variant={isFullyPaid ? 'default' : 'destructive'}>
                                                    {isFullyPaid ? 'Paid' : 'Unpaid'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => router.push(`/dealer/jackets/${jacket.vin}`)}>
                                                    Open Jacket
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No jackets found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}