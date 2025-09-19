"use client";


import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
import { useSafeSnapshot } from "@/hooks/useSafeSnapshot";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface MiscFee {
    id: string;
    description: string;
    amount: number;
    paid?: boolean;
    paidAt?: Timestamp | null;
    note?: string;
    createdAt?: Timestamp;
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
  jacketId?: string;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><Skeleton className="h-6 w-1/2 mb-4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/2 mb-4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

const DetailItem = ({ label, value }: { label: string, value: string | number | null | undefined }) => (
    value ? (
        <div className="flex justify-between text-sm py-2 border-b">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    ) : null
);


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
    };

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
        setError(err.code === 'permission-denied' ? "Please sign in to view this jacket." : "Failed to load jacket data.");
        setLoading(false);
      }
    );
  }, [vin, user?.uid, authLoading]);

  const fmtCurrency = (n?: number): string => {
    return (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
  };
  
  const isMgmtFeeActuallyPaid = useMemo(() => {
    if (!jacket) return false;
    return jacket.isMgmtFeePaid ?? jacket.isMgmtPaid ?? false;
  }, [jacket]);

  const financials = useMemo(() => {
    if (!jacket) return null;
    const num = (x: any): number => (typeof x === 'number' ? x : 0);
    const auctionDue = num(jacket.itemPrice);
    const mgmtDue = num(jacket.managementFee);
    
    const miscFees = jacket.miscFees || [];
    const totalMisc = miscFees.reduce((acc, fee) => acc + num(fee.amount), 0);
    const paidMisc = miscFees.filter(f => f.paid).reduce((acc, fee) => acc + num(fee.amount), 0);

    const amountPaid = (jacket.isAuctionPaid ? auctionDue + num(jacket.buyerFee) + num(jacket.onlineFee) : 0) + (isMgmtFeeActuallyPaid ? mgmtDue : 0) + paidMisc;
    const subtotal = auctionDue + num(jacket.buyerFee) + num(jacket.onlineFee) + mgmtDue + totalMisc;
    const balanceDue = subtotal - amountPaid;

    const isFullyPaid = balanceDue <= 0;

    return { subtotal, amountPaid, balanceDue, isFullyPaid, totalMisc };
  }, [jacket, isMgmtFeeActuallyPaid]);


  if (loading || authLoading) {
    return <JacketDetailSkeleton />;
  }

  if (error) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!jacket) {
    // This case is typically covered by the error state now
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
                    <CardTitle className={financials?.balanceDue && financials.balanceDue > 0 ? 'text-destructive' : ''}>{fmtCurrency(financials?.balanceDue)}</CardTitle>
                </Card>
            </div>
        </header>

        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="misc-fees">
                    Misc Fees <Badge variant="secondary" className="ml-2">{jacket.miscFees?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="documents" disabled={!financials?.isFullyPaid}>
                    Documents <Badge variant="secondary" className="ml-2">{jacket.documents?.length || 0}</Badge>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Vehicle Details</CardTitle></CardHeader>
                        <CardContent>
                            <dl>
                                <DetailItem label="Year" value={jacket.year} />
                                <DetailItem label="Make" value={jacket.make} />
                                <DetailItem label="Model" value={jacket.model} />
                                <DetailItem label="Color" value={jacket.color} />
                                <DetailItem label="Odometer" value={jacket.odometer ? `${jacket.odometer.toLocaleString()} miles` : null} />
                            </dl>
                        </CardContent>
                    </Card>
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
                 </div>
                 <div>
                    <Card>
                        <CardHeader><CardTitle>Financial Breakdown</CardTitle></CardHeader>
                        <CardContent>
                             <dl>
                                <DetailItem label="Unit Price" value={fmtCurrency(jacket.itemPrice)} />
                                <DetailItem label="Buyer Fee" value={fmtCurrency(jacket.buyerFee)} />
                                <DetailItem label="Online Fee" value={fmtCurrency(jacket.onlineFee)} />
                                <DetailItem label="Management Fee" value={fmtCurrency(jacket.managementFee)} />
                                <DetailItem label="Misc Fees Total" value={fmtCurrency(financials?.totalMisc)} />
                                <div className="flex justify-between text-sm py-3 mt-2 border-t-2">
                                    <dt className="font-bold">Total Cost</dt>
                                    <dd className="font-bold text-lg">{fmtCurrency(financials?.subtotal)}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                 </div>
            </TabsContent>
            <TabsContent value="misc-fees">
                <Card>
                    <CardHeader>
                        <CardTitle>Miscellaneous Fees</CardTitle>
                        <CardDescription>Additional fees associated with this jacket.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {(!jacket.miscFees || jacket.miscFees.length === 0) ? (
                            <p className="text-sm text-muted-foreground p-4 text-center">No miscellaneous fees have been added.</p>
                         ) : (
                             <Table>
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
                                                <Badge variant={fee.paid ? 'default' : 'destructive'}>
                                                    {fee.paid ? 'Paid' : 'Unpaid'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {fee.paid && fee.paidAt ? fee.paidAt.toDate().toLocaleDateString() : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="documents">
                <Card>
                    <CardHeader>
                        <CardTitle>Documents</CardTitle>
                        <CardDescription>Supporting documents for this jacket. This tab is unlocked once the balance is fully paid.</CardDescription>
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
            </TabsContent>
        </Tabs>
    </div>
  );
}
