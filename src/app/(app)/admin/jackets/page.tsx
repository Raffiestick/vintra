"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/client";
import { collection, query, onSnapshot, DocumentData, Timestamp, orderBy, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useSafeSnapshot } from "@/hooks/useSafeSnapshot";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import { differenceInDays } from 'date-fns';

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
  isMgmtPaid?: boolean; // Legacy
  isMgmtFeePaid?: boolean;
  miscFees?: { amount?: number; paid?: boolean }[];
  invoiceUrl?: string;
  dealerId?: string;
}

const num = (x: any) => Number(x ?? 0);
const safeDate = (ts: any) =>
  ts?.toDate?.() instanceof Date ? ts.toDate().toLocaleDateString('en-US', { timeZone: 'UTC' }) : "N/A";

const isJacketUnpaid = (jacket: Jacket): boolean => {
    const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
    const mgmtDue = num(jacket.managementFee);
    const paidMisc = (jacket.miscFees ?? []).filter(f => f.paid).reduce((s, f) => s + num(f.amount), 0);
    const unpaidMisc = (jacket.miscFees ?? []).filter(f => !f.paid).reduce((s, f) => s + num(f.amount), 0);
    const isMgmtPaid = (jacket.isMgmtFeePaid ?? jacket.isMgmtPaid) === true;
    const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtPaid ? mgmtDue : 0) + paidMisc;
    const totalCost = auctionDue + mgmtDue + paidMisc + unpaidMisc;
    const outstanding = Math.max(0, totalCost - amountPaid);
    return outstanding > 0.01;
};

const StatusBadges = ({ jacket }: { jacket: Jacket }) => {
  const isAuctionPaid = jacket.isAuctionPaid === true;
  const isMgmtPaid = (jacket.isMgmtFeePaid ?? jacket.isMgmtPaid) === true;
  return (
    <div className="flex flex-col gap-1 items-start">
      <Badge variant={isAuctionPaid ? 'default' : 'destructive'}>Auction {isAuctionPaid ? "Paid" : "Unpaid"}</Badge>
      <Badge variant={isMgmtPaid ? 'default' : 'destructive'}>Mgmt {isMgmtPaid ? "Paid" : "Unpaid"}</Badge>
    </div>
  );
};

function AdminJacketsSkeleton() {
    return (
        <div className="space-y-6">
            <Card className="panel"><CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader>
                <CardContent><div className="flex gap-4 mb-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-10 w-48" /></div><Table><TableHeader><TableRow>{[...Array(7)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-20" /></TableHead>)}</TableRow></TableHeader><TableBody>{[...Array(5)].map((_, i) => (<TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>))}</TableBody></Table></CardContent>
            </Card>
        </div>
    );
}

export default function AdminAllJacketsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [allJackets, setAllJackets] = useState<Jacket[]>([]);
  const [dealers, setDealers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    async function fetchDealers() {
      if (!isAdmin) return;
      const dealersQuery = query(collection(db, "users"), where("status", "==", "approved"));
      const querySnapshot = await getDocs(dealersQuery);
      const dealersMap = new Map<string, string>();
      querySnapshot.forEach(doc => {
        dealersMap.set(doc.id, doc.data().companyName || doc.id);
      });
      setDealers(dealersMap);
    }
    fetchDealers();
  }, [isAdmin]);

  useSafeSnapshot(() => {
    if (!isAdmin) {
      if (!authLoading) setLoading(false);
      return;
    };
    const q = query(collection(db, "jackets"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (querySnapshot) => {
      setAllJackets(querySnapshot.docs.map(doc => ({ id: doc.id, vin: doc.id, ...doc.data() } as Jacket)));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching all jackets: ", err);
      setError(err.code === 'permission-denied' ? "You don't have permission to view this." : "Failed to load jackets.");
      setLoading(false);
    });
  }, [isAdmin, authLoading]);

  const filteredJackets = useMemo(() => {
    const now = new Date();
    return allJackets.filter(jacket => {
      const vinMatch = jacket.vin.toLowerCase().includes(searchTerm.toLowerCase());
      if (!vinMatch) return false;

      const isUnpaid = isJacketUnpaid(jacket);
      const daysSinceSale = jacket.auctionSaleDate ? differenceInDays(now, jacket.auctionSaleDate.toDate()) : -1;

      switch (paymentFilter) {
        case 'paid':
          return !isUnpaid;
        case 'unpaid':
          return isUnpaid;
        case 'late10':
          return isUnpaid && daysSinceSale >= 10;
        case 'late15':
          return isUnpaid && daysSinceSale >= 15;
        case 'late30':
          return isUnpaid && daysSinceSale >= 30;
        case 'all':
        default:
          return true;
      }
    });
  }, [allJackets, searchTerm, paymentFilter]);
  
  const fmtCurrency = (n?: number) => (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (authLoading || loading) return <AdminJacketsSkeleton />;
  if (!isAdmin) return (<Card className="w-full max-w-md mx-auto mt-20 panel"><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">You must be an admin to view this page.</p></CardContent></Card>);
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
        <Card className="panel">
            <CardHeader>
                <CardTitle>All Jackets</CardTitle>
                <CardDescription>A list of all vehicle jackets in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                    <Input 
                        placeholder="Search by VIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm input-like"
                    />
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                        <SelectTrigger className="w-[220px] input-like">
                            <SelectValue placeholder="Filter by payment status..." />
                        </SelectTrigger>
                        <SelectContent className="panel">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="unpaid">All Unpaid</SelectItem>
                            <SelectItem value="paid">Fully Paid</SelectItem>
                            <SelectItem value="late10">10+ Days Delinquent</SelectItem>
                            <SelectItem value="late15">15+ Days Delinquent</SelectItem>
                            <SelectItem value="late30">30+ Days Delinquent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {filteredJackets.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Dealer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Auction Date</TableHead>
                            <TableHead>Days Delinquent</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredJackets.map((jacket) => {
                      const outstanding = isJacketUnpaid(jacket) ? (num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee) + num(jacket.managementFee) + (jacket.miscFees ?? []).filter(f=>!f.paid).reduce((s,f)=>s+num(f.amount),0)) - ((jacket.isAuctionPaid ? (num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee)) : 0) + (jacket.isMgmtFeePaid ? num(jacket.managementFee) : 0)) : 0;
                      const vehicleDesc = [jacket.year, jacket.make, jacket.model].filter(Boolean).join(" ");
                      const isUnpaid = isJacketUnpaid(jacket);
                      const daysDelinquent = isUnpaid && jacket.auctionSaleDate ? differenceInDays(new Date(), jacket.auctionSaleDate.toDate()) : 0;

                      return (
                        <TableRow key={jacket.id}>
                          <TableCell><div className="font-medium">{vehicleDesc}</div><div className="text-sm text-muted-foreground font-mono">{jacket.vin}</div></TableCell>
                          <TableCell><div className="text-sm">{dealers.get(jacket.dealerId || '') || 'Not Assigned'}</div></TableCell>
                          <TableCell><StatusBadges jacket={jacket} /></TableCell>
                          <TableCell>{safeDate(jacket.auctionSaleDate)}</TableCell>
                          <TableCell><Badge variant={daysDelinquent > 15 ? "destructive" : daysDelinquent > 7 ? "secondary" : "outline"}>{isUnpaid && daysDelinquent > 0 ? `${daysDelinquent} days` : '—'}</Badge></TableCell>
                          <TableCell className="text-right font-medium">{fmtCurrency(outstanding)}</TableCell>
                          <TableCell className="text-right"><div className="flex justify-end gap-2">
                              <Button asChild variant="outline" size="sm" className="btn-soft"><Link href={`/admin/jackets/${jacket.vin}`}>Open</Link></Button>
                              {!!jacket.invoiceUrl && (<Button asChild variant="secondary" size="sm" className="btn-soft"><a href={jacket.invoiceUrl} target="_blank" rel="noopener noreferrer">Invoice <ExternalLink className="ml-2 h-3 w-3" /></a></Button>)}
                            </div></TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                </Table>
                ) : (
                <div className="text-center py-10"><p className="text-muted-foreground">No jackets found matching your criteria.</p></div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}