
'use client';

import { useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, Timestamp, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useSafeSnapshot } from '@/hooks/useSafeSnapshot';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { httpsCallableClient } from '@/lib/firebase/client';


interface StagingHeader {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  source?: string;
  fileUrl?: string;
  unitsCount: number;
  status?: 'new' | 'in-progress' | 'processed';
  invoiceMeta?: { aucNo?: string; saleLocation?: string };
  invoiceDate?: string | null;      // "YYYY-MM-DD" string
  invoiceDateDisplay?: string; // "M/D/YYYY"
  invoiceDateTs?: Timestamp | null; // server timestamp at midnight UTC
}

function formatInvoiceDate(h: any): string {
  if (h?.invoiceDateDisplay) return h.invoiceDateDisplay;
  if (h?.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(h.invoiceDate)) {
    const [y,m,d] = h.invoiceDate.split("-");
    return `${+m}/${+d}/${y}`; // M/D/YYYY
  }
  if (h?.invoiceDateTs?.toDate) return h.invoiceDateTs.toDate().toLocaleDateString();
  return "—";
}


function StagingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(6)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function StagedInvoicesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<StagingHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideProcessed, setHideProcessed] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useSafeSnapshot(() => {
    if (!isAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }

    const qy = query(collection(db, 'stagingInvoices'), orderBy('createdAt', 'desc'));
    return onSnapshot(qy, async (qs) => {
      const rows = await Promise.all(qs.docs.map(async (d) => {
        const unitsCol = collection(db, 'stagingInvoices', d.id, 'units');
        const unitsSnapshot = await getDocs(unitsCol);
        return {
          id: d.id,
          unitsCount: unitsSnapshot.size,
          ...d.data()
        } as StagingHeader;
      }));
      setInvoices(rows);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching staged invoices:", err);
      setError(err.code === 'permission-denied' ? "You don't have permission to view this." : "Failed to load invoices.");
      setLoading(false);
    });

  }, [isAdmin, authLoading]);

  const getStatus = (h: StagingHeader) => {
    if (h.status) return h.status;
    return h.unitsCount > 0 ? 'in-progress' : 'new';
  };

  const filtered = useMemo(() => {
    if (!hideProcessed) return invoices;
    return invoices.filter(i => getStatus(i) !== 'processed');
  }, [invoices, hideProcessed]);

  async function handleProcessAll(stagingId: string) {
    const { id: toastId, update } = toast({ 
        title: "Processing Batch...", 
        description: "Please wait while jackets are being created." 
    });

    try {
      const createJacketsForInvoice = httpsCallableClient('createJacketsForInvoice');
      const res: any = await createJacketsForInvoice({ stagingId });
      
      const createdCount = res?.data?.created ?? 0;
      if (createdCount > 0) {
        update({ id: toastId, title: "Batch Processed!", description: `Successfully created ${createdCount} jackets.` });
      } else {
        update({ id: toastId, title: "Batch Complete", description: "No new jackets were created." });
      }
    } catch (e: any) {
      console.error(e);
      update({ 
        id: toastId, 
        title: "Batch Processing Failed", 
        description: e?.message || "An unknown error occurred.", 
        variant: "destructive" 
      });
    }
  }

  if (loading || authLoading) return <StagingSkeleton />;
  if (!isAdmin) return <p className="text-muted-foreground p-4">Admin access required.</p>;
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staged Invoices</CardTitle>
          <CardDescription>Invoices parsed and ready for review. Click a batch to open.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="hide-processed"
              checked={hideProcessed}
              onCheckedChange={(checked) => setHideProcessed(Boolean(checked))}
            />
            <Label htmlFor="hide-processed">Hide processed invoices</Label>
          </div>

          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Upload Time</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Source / Auc #</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.createdAt?.toDate().toLocaleString() ?? 'N/A'}</TableCell>
                    <TableCell>{formatInvoiceDate(h)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium uppercase">{h.source || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{h.invoiceMeta?.aucNo || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{h.unitsCount}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={getStatus(h) === 'processed' ? 'default' : 'outline'} className="capitalize">
                        {getStatus(h)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/admin/staging/invoices/${h.id}`)}>Open</Button>
                      <Button size="sm" onClick={() => handleProcessAll(h.id)} disabled={h.status === 'processed'}>Create Jackets (All)</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                {hideProcessed ? "No unprocessed invoices found." : "No invoices are currently in the staging area."}
              </p>
              <Button variant="link" asChild>
                <Link href="/admin/jackets/new">Upload an Invoice</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
