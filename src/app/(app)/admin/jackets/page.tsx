
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/client";
import { collection, query, onSnapshot, DocumentData, Timestamp, orderBy } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useSafeSnapshot } from "@/hooks/useSafeSnapshot";
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
  isMgmtPaid?: boolean; // Legacy
  isMgmtFeePaid?: boolean;
  miscFees?: { amount?: number; paid?: boolean }[];
  invoiceUrl?: string;
  dealerId?: string;
}

const num = (x: any) => Number(x ?? 0);
const safeDate = (ts: any) =>
  ts?.toDate?.() instanceof Date ? ts.toDate().toLocaleDateString() : "N/A";

const StatusBadges = ({ jacket }: { jacket: any }) => {
  const isAuctionPaid = jacket.isAuctionPaid === true;
  const isMgmtPaid = (jacket.isMgmtFeePaid ?? jacket.isMgmtPaid) === true;
  return (
    <div className="flex flex-col gap-1">
      <Badge variant={isAuctionPaid ? "default" : "destructive"}>
        Auction {isAuctionPaid ? "Paid" : "Unpaid"}
      </Badge>
      <Badge variant={isMgmtPaid ? "default" : "destructive"}>
        Mgmt {isMgmtPaid ? "Paid" : "Unpaid"}
      </Badge>
    </div>
  );
};


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
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  useSafeSnapshot(() => {
    if (!isAdmin) {
      if (!authLoading) setLoadingJackets(false);
      return;
    };

    setLoadingJackets(true);
    const q = query(collection(db, "jackets"), orderBy("createdAt", "desc"));
    
    return onSnapshot(q, (querySnapshot) => {
      const jacketsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        vin: doc.id, // Ensure VIN is consistent
        ...doc.data(),
      } as Jacket));
      setAllJackets(jacketsData);
      setLoadingJackets(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching all jackets: ", err);
      setError(err.code === 'permission-denied' ? "You don't have permission to view this." : "Failed to load jackets.");
      setLoadingJackets(false);
    });
  }, [isAdmin, authLoading]);

  const filteredJackets = useMemo(() => {
    return allJackets.filter(jacket => {
      const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
      const mgmtDue = num(jacket.managementFee);
      const miscUnpaid = (jacket.miscFees ?? [])
        .filter((f: any) => !f?.paid)
        .reduce((s: number, f: any) => s + num(f?.amount), 0);
  
      const isMgmtPaid = (jacket.isMgmtFeePaid ?? jacket.isMgmtPaid) === true;
      const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtPaid ? mgmtDue : 0);
      const outstanding = Math.max(0, auctionDue + mgmtDue + miscUnpaid - amountPaid);
      
      const vinMatch = jacket.vin.toLowerCase().includes(searchTerm.toLowerCase());
      const unpaidMatch = !showUnpaidOnly || outstanding > 0;
      return vinMatch && unpaidMatch;
    });
  }, [allJackets, searchTerm, showUnpaidOnly]);
  
  if (authLoading || loadingJackets) {
    return <AdminJacketsSkeleton />;
  }

  if (!isAdmin) {
    return (
        <Card className="w-full max-w-md mx-auto mt-20 panel">
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You must be an admin to view this page.</p>
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
        <Card className="panel">
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
                        className="max-w-sm input-like"
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
                      const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
                      const mgmtDue = num(jacket.managementFee);
                      const miscUnpaid = (jacket.miscFees ?? [])
                        .filter((f: any) => !f?.paid)
                        .reduce((s: number, f: any) => s + num(f?.amount), 0);

                      const isMgmtPaid = (jacket.isMgmtFeePaid ?? jacket.isMgmtPaid) === true;
                      const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtPaid ? mgmtDue : 0);
                      const outstanding = Math.max(0, auctionDue + mgmtDue + miscUnpaid - amountPaid);

                      const vehicleDesc = [jacket.year, jacket.make, jacket.model].filter(Boolean).join(" ");

                      return (
                        <TableRow key={jacket.vin ?? jacket.id}>
                          <TableCell>
                            <div className="font-medium">{vehicleDesc || "Vehicle Details Missing"}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {jacket.vin ?? "No VIN"}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-xs truncate max-w-[180px] font-mono" title={jacket.dealerId || "N/A"}>
                              {jacket.dealerId || "Not Assigned"}
                            </div>
                          </TableCell>

                          <TableCell>
                            <StatusBadges jacket={jacket} />
                          </TableCell>

                          <TableCell>{safeDate(jacket.auctionSaleDate)}</TableCell>

                          <TableCell className="text-right font-medium">
                            {(outstanding ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button asChild variant="outline" size="sm" className="btn-soft">
                                <Link href={`/admin/jackets/${encodeURIComponent(jacket.vin ?? jacket.id)}`}>
                                  Open
                                </Link>
                              </Button>
                              {!!jacket.invoiceUrl && (
                                <Button asChild variant="secondary" size="sm" className="btn-soft">
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
