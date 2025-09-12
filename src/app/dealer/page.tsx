
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp, DocumentData, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSafeSnapshot } from "@/hooks/useSafeSnapshot";
import { useAuth } from "@/hooks/use-auth";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileText, Download, Package, Car } from "lucide-react";
import { useWindowSize } from 'react-use';

const ITEMS_PER_PAGE = 10;

interface Jacket extends DocumentData {
    id: string;
    vin: string;
    year?: number;
    make?: string;
    model?: string;
    color?: string;
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
    invoiceUrl?: string;
    bosUrl?: string;
    packetUrl?: string;
}

interface DealerProfile {
    companyName?: string;
    contactName?: string;
    displayName?: string;
    email?: string;
}

const num = (x: any): number => Number(x || 0);

const calculateFinancials = (jacket: Jacket) => {
    const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
    const mgmtDue = num(jacket.managementFee);
    const miscTotal = Array.isArray(jacket.miscFees) ? jacket.miscFees.reduce((s, f) => s + num(f?.amount), 0) : 0;
    const subtotal = auctionDue + mgmtDue + miscTotal;
    const isMgmtActuallyPaid = (jacket.isMgmtFeePaid ?? jacket.isMgmtPaid) === true;
    const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtActuallyPaid ? mgmtDue : 0);
    const balanceDue = Math.max(0, subtotal - amountPaid);
    const isFullyPaid = jacket.isAuctionPaid && isMgmtActuallyPaid;
    return { amountPaid, balanceDue, isFullyPaid };
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
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowSize();
    const isMobile = width < 768;

    const [profile, setProfile] = useState<DealerProfile | null>(null);
    const [jackets, setJackets] = useState<Jacket[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            const profileDoc = await getDoc(doc(db, "users", user.uid));
            if (profileDoc.exists()) {
                setProfile(profileDoc.data() as DealerProfile);
            }
        };
        fetchProfile();
    }, [user]);

    useSafeSnapshot(() => {
        if (!user?.uid) {
            if (!authLoading) setLoadingData(false);
            return;
        }

        setLoadingData(true);
        const q = query(
            collection(db, "jackets"),
            where("dealerId", "==", user.uid),
            where("createdAt", "!=", null), // Ensure createdAt exists for ordering
            orderBy("createdAt", "desc")
        );
        return onSnapshot(q, (snapshot) => {
            const jacketsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Jacket));
            setJackets(jacketsData);
            setLoadingData(false);
            setError(null);
        }, (err) => {
            setError(err.code === 'permission-denied' ? "Please sign in to view your jackets." : "Failed to load jackets.");
            setLoadingData(false);
        });
    }, [user?.uid, authLoading]);

    const metrics = useMemo(() => {
        if (jackets.length === 0) {
            return { unitsPurchased: 0, totalAmountPaid: 0, totalAmountOwed: 0 };
        }
        return jackets.reduce((acc, jacket) => {
            const { amountPaid, balanceDue } = calculateFinancials(jacket);
            return {
                unitsPurchased: acc.unitsPurchased + 1,
                totalAmountPaid: acc.totalAmountPaid + amountPaid,
                totalAmountOwed: acc.totalAmountOwed + balanceDue,
            };
        }, { unitsPurchased: 0, totalAmountPaid: 0, totalAmountOwed: 0 });
    }, [jackets]);
    
    const filteredJackets = useMemo(() => {
        let results = jackets;
        const lowercasedFilter = searchTerm.toLowerCase();
        
        if (searchTerm) {
            results = results.filter(j => 
                j.vin.toLowerCase().includes(lowercasedFilter) ||
                j.make?.toLowerCase().includes(lowercasedFilter) ||
                j.model?.toLowerCase().includes(lowercasedFilter) ||
                j.year?.toString().includes(lowercasedFilter)
            );
        }

        if (filter !== "all") {
            results = results.filter(j => {
                const { isFullyPaid } = calculateFinancials(j);
                return filter === "paid" ? isFullyPaid : !isFullyPaid;
            });
        }
        
        return results;
    }, [jackets, searchTerm, filter]);

    const paginatedJackets = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredJackets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredJackets, currentPage]);

    const totalPages = Math.ceil(filteredJackets.length / ITEMS_PER_PAGE);

    const fmtCurrency = (n?: number) => (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

    if (authLoading || loadingData) {
        return <DashboardSkeleton />;
    }
    
    if (!user) {
        return <div className="p-4 text-sm text-muted-foreground">Please sign in to view your dashboard.</div>;
    }
    
    if (error) {
        return <div className="p-4 text-sm text-red-600">{error}</div>;
    }

    const welcomeName = profile?.companyName || profile?.contactName || profile?.displayName || user?.email || 'Dealer';

    const ActionButtons = ({ jacket }: { jacket: Jacket }) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={() => router.push(`/dealer/jackets/${jacket.vin}`)}>
                <Car className="mr-2" /> Open Jacket
            </Button>
            {jacket.invoiceUrl && (
                <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                        <a href={jacket.invoiceUrl} target="_blank" rel="noopener noreferrer"><Download /> Invoice</a>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                        <a href={`/dealer/print?url=${encodeURIComponent(jacket.invoiceUrl)}`} target="_blank" rel="noopener noreferrer"><Printer /></a>
                    </Button>
                </div>
            )}
            {jacket.bosUrl && (
                <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                        <a href={jacket.bosUrl} target="_blank" rel="noopener noreferrer"><Download /> BOS</a>
                    </Button>
                     <Button asChild size="sm" variant="secondary">
                        <a href={`/dealer/print?url=${encodeURIComponent(jacket.bosUrl)}`} target="_blank" rel="noopener noreferrer"><Printer /></a>
                    </Button>
                </div>
            )}
            {jacket.packetUrl && (
                <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                        <a href={jacket.packetUrl} target="_blank" rel="noopener noreferrer"><Package /> Packet</a>
                    </Button>
                     <Button asChild size="sm" variant="secondary">
                        <a href={`/dealer/print?url=${encodeURIComponent(jacket.packetUrl)}`} target="_blank" rel="noopener noreferrer"><Printer /></a>
                    </Button>
                </div>
            )}
        </div>
    );

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
                    <CardHeader><CardTitle>Total Balance Due</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-destructive">{fmtCurrency(metrics.totalAmountOwed)}</p></CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <Input 
                            placeholder="Search by VIN, Make, Model, or Year..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full md:max-w-sm"
                        />
                        <Tabs value={filter} onValueChange={(v) => { setFilter(v); setCurrentPage(1); }} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="paid">Paid</TabsTrigger>
                                <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    {paginatedJackets.length === 0 ? (
                         <div className="text-center py-10">
                            <p className="text-muted-foreground">No jackets found matching your criteria.</p>
                        </div>
                    ) : isMobile ? (
                        <div className="space-y-4">
                            {paginatedJackets.map(jacket => {
                                const { isFullyPaid, amountPaid, balanceDue } = calculateFinancials(jacket);
                                return (
                                <Card key={jacket.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="font-mono text-base">{jacket.vin}</CardTitle>
                                                <CardDescription>{jacket.auctionSaleDate ? jacket.auctionSaleDate.toDate().toLocaleDateString() : 'N/A'}</CardDescription>
                                            </div>
                                            <Badge variant={isFullyPaid ? 'default' : 'destructive'}>
                                                {isFullyPaid ? 'Paid' : 'Unpaid'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="font-medium">{[jacket.year, jacket.make, jacket.model, jacket.color].filter(Boolean).join(' ')}</p>
                                        <div className="flex justify-between text-sm">
                                            <div className="text-muted-foreground">Paid: <span className="font-medium text-foreground">{fmtCurrency(amountPaid)}</span></div>
                                            <div className="text-muted-foreground">Due: <span className="font-medium text-destructive">{fmtCurrency(balanceDue)}</span></div>
                                        </div>
                                        <ActionButtons jacket={jacket} />
                                    </CardContent>
                                </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Auction Date</TableHead>
                                    <TableHead>Vehicle</TableHead>
                                    <TableHead>Financials</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedJackets.map(jacket => {
                                    const { isFullyPaid, amountPaid, balanceDue } = calculateFinancials(jacket);
                                    const vehicleDesc = [jacket.year, jacket.make, jacket.model, jacket.color].filter(Boolean).join(' ');
                                    return (
                                        <TableRow key={jacket.id}>
                                            <TableCell>{jacket.auctionSaleDate ? jacket.auctionSaleDate.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{vehicleDesc || "Details Missing"}</div>
                                                <div className="text-sm text-muted-foreground font-mono">{jacket.vin}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">Paid: {fmtCurrency(amountPaid)}</Badge>
                                                <Badge variant="destructive" className="ml-2">Due: {fmtCurrency(balanceDue)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={isFullyPaid ? 'default' : 'destructive'}>
                                                    {isFullyPaid ? 'Paid' : 'Unpaid'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ActionButtons jacket={jacket} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
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

    