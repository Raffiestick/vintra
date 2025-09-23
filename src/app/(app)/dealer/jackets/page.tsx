"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentData } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Download, Package, Car, AlertCircle } from "lucide-react";
import { useWindowSize } from 'react-use';

const ITEMS_PER_PAGE = 10;

interface Jacket extends DocumentData {
    id: string; vin: string; year?: number; make?: string; model?: string; color?: string;
    createdAt?: string | null;
    auctionSaleDate?: string | null;
    itemPrice?: number; buyerFee?: number; onlineFee?: number; managementFee?: number;
    isAuctionPaid?: boolean; isMgmtPaid?: boolean; isMgmtFeePaid?: boolean;
    miscFees?: { amount?: number, paid?: boolean }[];
    invoiceUrl?: string; bosUrl?: string; packetUrl?: string;
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
    const miscFees = jacket.miscFees || [];
    const unpaidMisc = miscFees.filter(f => !f.paid).reduce((s, f) => s + num(f?.amount), 0);
    const paidMisc = miscFees.filter(f => f.paid).reduce((s, f) => s + num(f?.amount), 0);
    const totalCost = auctionDue + mgmtDue + unpaidMisc + paidMisc;
    const isMgmtActuallyPaid = (jacket.isMgmtFeePaid ?? jacket.isMgmtPaid) === true;
    const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtActuallyPaid ? mgmtDue : 0) + paidMisc;
    const balanceDue = Math.max(0, totalCost - amountPaid);
    const isFullyPaid = balanceDue <= 0.01;
    return { amountPaid, balanceDue, isFullyPaid };
};

function DashboardSkeleton() {
  return ( <div className="space-y-6"><Skeleton className="h-8 w-1/3" /><div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => (<Card key={i}><CardHeader><Skeleton className="h-5 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>))}</div><Card><CardHeader><Skeleton className="h-10 w-1/2" /></CardHeader><CardContent><Table><TableHeader><TableRow>{[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}</TableRow></TableHeader><TableBody>{[...Array(5)].map((_, i) => (<TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>))}</TableBody></Table></CardContent></Card></div> );
}

export default function DealerJacketsPage() {
    const router = useRouter();
    const { user, claims, loading: authLoading } = useAuth();
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
        if (!authLoading && !user) {
            window.dispatchEvent(new CustomEvent("vintra:auth", { detail: { action: "open", tab: "sign-in" }}));
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !claims?.dealer) {
            setLoadingData(false);
            return;
        }

        const fetchJackets = async () => {
            setLoadingData(true);
            setError(null);
            try {
                const getDealerJackets = httpsCallable(functions, 'getDealerJackets');
                const result = await getDealerJackets();
                const jacketsData = (result.data as Jacket[]).sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });
                setJackets(jacketsData);
            } catch (err: any) {
                console.error("Cloud Function Error:", err);
                setError("Failed to load jackets. Please try again.");
            } finally {
                setLoadingData(false);
            }
        };
        
        fetchJackets();
    }, [user, claims, authLoading]);

    const metrics = useMemo(() => {
        if (jackets.length === 0) return { unitsPurchased: 0, totalAmountPaid: 0, totalAmountOwed: 0 };
        return jackets.reduce((acc, jacket) => {
            const { amountPaid, balanceDue } = calculateFinancials(jacket);
            return { unitsPurchased: acc.unitsPurchased + 1, totalAmountPaid: acc.totalAmountPaid + amountPaid, totalAmountOwed: acc.totalAmountOwed + balanceDue };
        }, { unitsPurchased: 0, totalAmountPaid: 0, totalAmountOwed: 0 });
    }, [jackets]);
    
    const filteredJackets = useMemo(() => {
        let results = jackets;
        const lowercasedFilter = searchTerm.toLowerCase();
        if (searchTerm) {
            results = results.filter(j => j.vin.toLowerCase().includes(lowercasedFilter) || j.make?.toLowerCase().includes(lowercasedFilter) || j.model?.toLowerCase().includes(lowercasedFilter) || j.year?.toString().includes(lowercasedFilter));
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

    if (authLoading || loadingData) return <DashboardSkeleton />;
    if (!user || !claims?.dealer) return <div className="p-4 text-center"><AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-semibold">Access Denied</h3><p className="mt-1 text-sm text-muted-foreground">You must be an approved dealer to view this page.</p></div>;
    if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;

    const welcomeName = profile?.companyName || 'Dealer';
    
    const ActionButtons = ({ jacket }: { jacket: Jacket }) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={() => router.push(`/dealer/jackets/${jacket.vin}`)} className="btn-primary"><Car className="mr-2 h-4 w-4" /> Open Jacket</Button>
            {jacket.invoiceUrl && (<div className="flex gap-2"><Button asChild size="sm" variant="outline" className="btn-soft"><a href={jacket.invoiceUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-4 w-4"/> Invoice</a></Button><Button asChild size="sm" variant="secondary" className="btn-soft"><a href={`/dealer/print?url=${encodeURIComponent(jacket.invoiceUrl)}`} target="_blank" rel="noopener noreferrer"><Printer className="h-4 w-4"/></a></Button></div>)}
            {jacket.bosUrl && (<div className="flex gap-2"><Button asChild size="sm" variant="outline" className="btn-soft"><a href={jacket.bosUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-4 w-4"/> BOS</a></Button><Button asChild size="sm" variant="secondary" className="btn-soft"><a href={`/dealer/print?url=${encodeURIComponent(jacket.bosUrl)}`} target="_blank" rel="noopener noreferrer"><Printer className="h-4 w-4"/></a></Button></div>)}
            {jacket.packetUrl && (<div className="flex gap-2"><Button asChild size="sm" variant="outline" className="btn-soft"><a href={jacket.packetUrl} target="_blank" rel="noopener noreferrer"><Package className="mr-1 h-4 w-4" /> Packet</a></Button><Button asChild size="sm" variant="secondary" className="btn-soft"><a href={`/dealer/print?url=${encodeURIComponent(jacket.packetUrl)}`} target="_blank" rel="noopener noreferrer"><Printer className="h-4 w-4"/></a></Button></div>)}
        </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome, {welcomeName}</h1>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="panel"><CardHeader><CardTitle>Units Purchased</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{metrics.unitsPurchased}</p></CardContent></Card>
                <Card className="panel"><CardHeader><CardTitle>Total Amount Paid</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmtCurrency(metrics.totalAmountPaid)}</p></CardContent></Card>
                <Card className="panel"><CardHeader><CardTitle>Total Balance Due</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{fmtCurrency(metrics.totalAmountOwed)}</p></CardContent></Card>
            </div>
            
            <Card className="panel">
                <CardHeader>
                    <CardTitle>My Jackets</CardTitle>
                    <CardDescription>A list of all vehicle jackets assigned to you.</CardDescription>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-4">
                        <Input placeholder="Search by VIN, Make, Model, or Year..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full md:max-w-sm input-like"/>
                        <Tabs value={filter} onValueChange={(v) => { setFilter(v); setCurrentPage(1); }} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="paid">Paid</TabsTrigger><TabsTrigger value="unpaid">Unpaid</TabsTrigger></TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    {paginatedJackets.length === 0 ? (
                         <div className="text-center py-10"><p className="text-muted-foreground">No jackets found matching your criteria.</p></div>
                    ) : isMobile ? (
                        <div className="space-y-4">
                            {paginatedJackets.map(jacket => {
                                const { isFullyPaid, amountPaid, balanceDue } = calculateFinancials(jacket);
                                return (
                                <Card key={jacket.id} className="panel-muted">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="font-mono text-base">{jacket.vin}</CardTitle>
                                                <CardDescription>{jacket.auctionSaleDate ? new Date(jacket.auctionSaleDate).toLocaleDateString() : 'N/A'}</CardDescription>
                                            </div>
                                            <Badge variant={isFullyPaid ? 'default' : 'destructive'}>{isFullyPaid ? 'Paid' : 'Unpaid'}</Badge>
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
                            <TableHeader><TableRow><TableHead>Auction Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Financials</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {paginatedJackets.map(jacket => {
                                    const { isFullyPaid, amountPaid, balanceDue } = calculateFinancials(jacket);
                                    const vehicleDesc = [jacket.year, jacket.make, jacket.model, jacket.color].filter(Boolean).join(' ');
                                    return (
                                        <TableRow key={jacket.id}>
                                            <TableCell>{jacket.auctionSaleDate ? new Date(jacket.auctionSaleDate).toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell className="min-w-[160px]"><div className="font-medium">{vehicleDesc || "Details Missing"}</div><div className="text-sm text-muted-foreground font-mono">{jacket.vin}</div></TableCell>
                                            <TableCell><Badge variant="outline">Paid: {fmtCurrency(amountPaid)}</Badge><Badge variant="destructive" className="ml-2">Due: {fmtCurrency(balanceDue)}</Badge></TableCell>
                                            <TableCell><Badge variant={isFullyPaid ? 'default' : 'destructive'}>{isFullyPaid ? 'Paid' : 'Unpaid'}</Badge></TableCell>
                                            <TableCell className="text-right"><ActionButtons jacket={jacket} /></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-soft">Previous</Button>
                            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-soft">Next</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}