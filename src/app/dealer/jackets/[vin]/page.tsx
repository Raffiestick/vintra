
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface JacketDocument {
    id: string;
    name: string;
    type: "title" | "poa" | "addendum";
    url: string;
    createdAt?: Timestamp;
}

interface Jacket {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  jacketId?: string;
  itemPrice?: number;
  buyerFee?: number;
  onlineFee?: number;
  managementFee?: number;
  miscFees?: { amount?: number }[];
  documents?: JacketDocument[];
  invoiceUrl?: string;
  bosUrl?: string;
  packetUrl?: string;
  dealerId?: string;
  isAuctionPaid?: boolean;
  isMgmtFeePaid?: boolean;
  isMgmtPaid?: boolean; // Legacy
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}


function JacketDetailSkeleton() {
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-12 w-32" />
            </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><Skeleton className="h-6 w-1/2 mb-4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/2 mb-4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

export default function DealerJacketDetailPage() {
  const params = useParams<{ vin: string | string[] }>();
  const vin = useMemo(() => (Array.isArray(params?.vin) ? params.vin[0] : params?.vin), [params?.vin]);
  const { user, loading: authLoading } = useAuth();
  
  const [jacket, setJacket] = useState<Jacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!vin || !user) return;

    const jacketDocRef = doc(db, "jackets", vin);
    const unsubscribe = onSnapshot(
      jacketDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const jacketData = { vin: docSnap.id, ...docSnap.data() } as Jacket;
          if (jacketData.dealerId === user.uid) {
            setJacket(jacketData);
            setAccessDenied(false);
          } else {
            setAccessDenied(true);
          }
        } else {
          setAccessDenied(true);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching jacket:", err);
        setAccessDenied(true); 
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [vin, user]);

  const fmtCurrency = (n?: number): string => {
    return (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
  };
  
  const isMgmtFeeActuallyPaid = useMemo(() => {
    if (!jacket) return false;
    return jacket.isMgmtFeePaid ?? jacket.isMgmtPaid ?? false;
  }, [jacket]);

  const financials = useMemo(() => {
    if (!jacket) return null;
    const num = (x: any) => (typeof x === 'number' ? x : 0);
    const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
    const mgmtDue = num(jacket.managementFee);
    const miscTotal = jacket.miscFees?.reduce((acc, fee) => acc + num(fee?.amount), 0) || 0;
    const subtotal = auctionDue + mgmtDue + miscTotal;
    const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtFeeActuallyPaid ? mgmtDue : 0);
    const balanceDue = subtotal - amountPaid;
    return { subtotal, amountPaid, balanceDue };
  }, [jacket, isMgmtFeeActuallyPaid]);


  if (loading || authLoading) {
    return <JacketDetailSkeleton />;
  }

  if (accessDenied) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this jacket.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!jacket) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Jacket Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No jacket found with VIN: <span className="font-mono bg-muted px-2 py-1 rounded">{vin}</span>.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold">
                    {jacket.year || ""} {jacket.make || "Unknown"}{" "}
                    {jacket.model || "Vehicle"}
                </h1>
                <p className="text-sm text-muted-foreground font-mono">{jacket.vin}</p>
                 {jacket.jacketId && <Badge variant="secondary" className="mt-2">Jacket ID: {jacket.jacketId}</Badge>}
            </div>
            <div className="flex items-center gap-4">
                <Card className="p-3">
                    <CardDescription>Amount Paid</CardDescription>
                    <CardTitle>{fmtCurrency(financials?.amountPaid)}</CardTitle>
                </Card>
                <Card className="p-3">
                    <CardDescription>Balance Due</CardDescription>
                    <CardTitle>{fmtCurrency(financials?.balanceDue)}</CardTitle>
                </Card>
            </div>
        </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
              <CardHeader><CardTitle>Files & Downloads</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                  {jacket.invoiceUrl && (
                      <Button asChild variant="outline" className="w-full justify-start">
                          <a href={jacket.invoiceUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2" /> Open Invoice PDF
                          </a>
                      </Button>
                  )}
                   {jacket.bosUrl && (
                      <Button asChild variant="outline" className="w-full justify-start">
                          <a href={jacket.bosUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2" /> Open Bill of Sale PDF
                          </a>
                      </Button>
                  )}
                  {jacket.packetUrl && (
                      <Button asChild className="w-full justify-start">
                          <a href={jacket.packetUrl} target="_blank" rel="noopener noreferrer">
                              <Package className="mr-2" /> Open Full Packet (Invoice + BOS)
                          </a>
                      </Button>
                  )}
                  {!jacket.invoiceUrl && !jacket.bosUrl && !jacket.packetUrl && (
                    <p className="text-sm text-muted-foreground text-center py-4">No generated files available yet.</p>
                  )}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Supporting documents for this jacket.</CardDescription>
              </CardHeader>
              <CardContent>
                  {(!jacket.documents || jacket.documents.length === 0) ? (
                      <p className="text-sm text-muted-foreground p-4 text-center">No documents uploaded.</p>
                  ) : (
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>File Name</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Added</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {jacket.documents.map((doc) => (
                                  <TableRow key={doc.id}>
                                      <TableCell>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline text-primary">
                                            <FileText className="h-4 w-4" />
                                            {doc.name}
                                        </a>
                                      </TableCell>
                                      <TableCell><Badge variant="outline" className="capitalize">{doc.type}</Badge></TableCell>
                                      <TableCell>{doc.createdAt ? doc.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  )}
              </CardContent>
          </Card>
      </div>
    </div>
  );
}

    