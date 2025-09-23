"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
import { useSafeSnapshot } from "@/hooks/useSafeSnapshot";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";

interface MiscFee {
  id: string;
  description: string;
  amount: number;
  paid?: boolean;
  paidAt?: Timestamp | null;
}

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
  color?: string;
  odometer?: number;
  jacketNumber?: string;
  itemPrice?: number;
  buyerFee?: number;
  onlineFee?: number;
  managementFee?: number;
  miscFees?: MiscFee[];
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
    <main className="w-full max-w-screen-xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-3">
        <div className="space-y-1">
          <Skeleton className="h-7 w-60 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </main>
  );
}

const DetailItem = ({
  label,
  value,
  isCurrency = false,
}: {
  label: string;
  value: string | number | null | undefined;
  isCurrency?: boolean;
}) => {
  const fmtCurrency = (n?: number): string =>
    (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (value === null || typeof value === "undefined" || value === "") return null;

  return (
    <div className="flex justify-between text-sm py-2 border-b border-white/5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{isCurrency ? fmtCurrency(Number(value)) : value}</dd>
    </div>
  );
};

export default function DealerJacketDetailPage() {
  const params = useParams<{ vin: string | string[] }>();
  const vin = useMemo(() => (Array.isArray(params?.vin) ? params.vin[0] : params?.vin), [params?.vin]);
  const { user, loading: authLoading } = useAuth();

  const [jacket, setJacket] = useState<Jacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSafeSnapshot(() => {
    if (!vin || !user?.uid) {
      if (!authLoading) setLoading(false);
      return;
    }

    const jacketDocRef = doc(db, "jackets", vin as string);
    return onSnapshot(
      jacketDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const jacketData = { vin: docSnap.id, ...docSnap.data() } as Jacket;
          if (jacketData.dealerId === user.uid) {
            setJacket(jacketData);
            setError(null);
          } else {
            setError("Access Denied: You do not have permission to view this jacket.");
          }
        } else {
          setError("Jacket not found.");
        }
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === "permission-denied"
            ? "Please sign in to view this jacket."
            : "Failed to load jacket data."
        );
        setLoading(false);
      }
    );
  }, [vin, user?.uid, authLoading]);

  const fmtCurrency = (n?: number): string =>
    (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

  const isMgmtFeeActuallyPaid = useMemo(() => {
    if (!jacket) return false;
    return jacket.isMgmtFeePaid ?? jacket.isMgmtPaid ?? false;
  }, [jacket]);

  const financials = useMemo(() => {
    if (!jacket) return null;
    const num = (x: any): number => (typeof x === "number" ? x : 0);
    const auctionTotal = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
    const mgmtDue = num(jacket.managementFee);

    const miscFees = jacket.miscFees || [];
    const totalMisc = miscFees.reduce((acc, fee) => acc + num(fee.amount), 0);
    const paidMisc = miscFees.filter((f) => f.paid).reduce((acc, fee) => acc + num(fee.amount), 0);

    const amountPaid =
      (jacket.isAuctionPaid ? auctionTotal : 0) + (isMgmtFeeActuallyPaid ? mgmtDue : 0) + paidMisc;
    const subtotal = auctionTotal + mgmtDue + totalMisc;
    const balanceDue = Math.max(0, subtotal - amountPaid);
    const isFullyPaid = balanceDue < 0.01;

    return { subtotal, amountPaid, balanceDue, isFullyPaid, totalMisc };
  }, [jacket, isMgmtFeeActuallyPaid]);

  if (loading || authLoading) return <JacketDetailSkeleton />;

  if (error) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <Card className="panel text-center w-full max-w-lg">
          <CardHeader className="py-4">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <CardTitle className="text-xl font-bold text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p>{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!jacket) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <Card className="panel text-center w-full max-w-lg">
          <CardHeader className="py-4">
            <CardTitle className="text-xl font-bold">Jacket Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p>
              No jacket found with VIN:{" "}
              <span className="font-mono bg-muted px-2 py-1 rounded">{vin}</span>.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="w-full max-w-screen-xl mx-auto p-4 md:p-6 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {jacket.year} {jacket.make} {jacket.model}
            </h1>
            {jacket.jacketNumber && (
              <Badge variant="secondary" className="text-xs md:text-sm">#{jacket.jacketNumber}</Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground font-mono">{jacket.vin}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={jacket.isAuctionPaid ? "default" : "destructive"} className="text-xs">
            {jacket.isAuctionPaid ? "Auction Paid" : "Auction Unpaid"}
          </Badge>
          <Badge variant={isMgmtFeeActuallyPaid ? "default" : "destructive"} className="text-xs">
            {isMgmtFeeActuallyPaid ? "Mgmt Fee Paid" : "Mgmt Fee Unpaid"}
          </Badge>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* LEFT: main content */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">
          {/* Stats */}
          <Card className="panel">
            <CardHeader className="py-3 px-4">
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Total Cost</div>
                  <div className="text-lg font-semibold">{fmtCurrency(financials?.subtotal)}</div>
                </div>
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Amount Paid</div>
                  <div className="text-lg font-semibold">{fmtCurrency(financials?.amountPaid)}</div>
                </div>
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Balance Due</div>
                  <div className="text-lg font-semibold">{fmtCurrency(financials?.balanceDue)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle details */}
          <Card className="panel">
            <CardHeader className="py-3 px-4">
              <CardTitle>Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <dl>
                <DetailItem label="Year" value={jacket.year} />
                <DetailItem label="Make" value={jacket.make} />
                <DetailItem label="Model" value={jacket.model} />
                <DetailItem label="Color" value={jacket.color} />
                <DetailItem
                  label="Odometer"
                  value={jacket.odometer ? `${jacket.odometer.toLocaleString()} miles` : "N/A"}
                />
              </dl>
            </CardContent>
          </Card>

          {/* Misc fees */}
          <Card className="panel">
            <CardHeader className="py-3 px-4">
              <CardTitle>Miscellaneous Fees</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {!jacket.miscFees || jacket.miscFees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No miscellaneous fees have been added.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jacket.miscFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell className="font-medium">{fee.description}</TableCell>
                          <TableCell>{fmtCurrency(fee.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={fee.paid ? "default" : "destructive"}>
                              {fee.paid ? "Paid" : "Unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {fee.paid && fee.paidAt
                              ? fee.paidAt.toDate().toLocaleDateString("en-US", { timeZone: "UTC" })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: downloads + docs */}
        <div className="lg:col-span-1 space-y-4 md:space-y-5">
          <Card className="panel">
            <CardHeader className="py-3 px-4">
              <CardTitle>Files & Downloads</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <Label>Jacket Invoice</Label>
                {jacket.invoiceUrl ? (
                  <Button asChild size="sm" className="btn-soft">
                    <a href={jacket.invoiceUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                ) : (
                  <Badge variant="secondary">Not Generated</Badge>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <Label>Bill of Sale</Label>
                {jacket.bosUrl ? (
                  <Button asChild size="sm" className="btn-soft">
                    <a href={jacket.bosUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                ) : (
                  <Badge variant="secondary">Not Generated</Badge>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <Label>Full Jacket Packet</Label>
                {jacket.packetUrl ? (
                  <Button asChild size="sm" className="btn-soft">
                    <a href={jacket.packetUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                ) : (
                  <Badge variant="secondary">Not Generated</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader className="py-3 px-4">
              <CardTitle>Documents</CardTitle>
              <CardDescription className="text-xs">
                {financials?.isFullyPaid
                  ? "Supporting documents for this jacket."
                  : "This tab is unlocked once the balance is fully paid."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {!financials?.isFullyPaid ? (
                <div className="text-center py-6 text-muted-foreground">
                  Pay the remaining balance to view documents.
                </div>
              ) : !jacket.documents || jacket.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">No documents uploaded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-sm">
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
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline text-primary"
                            >
                              <FileText className="h-4 w-4" />
                              {doc.name}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {doc.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.createdAt
                              ? doc.createdAt.toDate().toLocaleDateString("en-US", { timeZone: "UTC" })
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
