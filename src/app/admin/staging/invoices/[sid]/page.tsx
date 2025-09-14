'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, doc, onSnapshot, orderBy, query, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type Status = 'new' | 'in-progress' | 'processed';

interface InvoiceMeta { aucNo?: string; saleLocation?: string; }

interface StagingHeader {
  id: string;
  source?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  invoiceMeta?: InvoiceMeta;
  invoiceDate?: string;        // "YYYY-MM-DD"
  invoiceDateTs?: Timestamp;   // Firestore Timestamp
  fileUrl?: string;
}

interface StagingUnit {
  id: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  stockNo?: string;
  titleInfo?: string;
  itemPrice?: number;
  buyerFee?: number;
  onlineFee?: number;
  processed?: boolean;
  invoiceDate?: string;
}

function currency(n?: number) {
  const v = typeof n === 'number' ? n : 0;
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatInvoiceDate(h?: StagingHeader | null): string {
  const iso = h?.invoiceDate?.trim() ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T00:00:00Z`).toLocaleDateString();
  if (h?.invoiceDateTs?.toDate) { try { return h.invoiceDateTs.toDate().toLocaleDateString(); } catch {} }
  return '—';
}

function PageSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-6 w-28 rounded-full" />))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(5)].map((_, i) => (<TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(2)].map((_, r) => (
              <TableRow key={r}>
                {[...Array(5)].map((_, c) => (<TableCell key={c}><Skeleton className="h-6 w-full" /></TableCell>))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function StagingInvoiceDetailPage() {
  const params = useParams<{ sid: string }>();
  const stagingId = Array.isArray(params?.sid) ? params.sid[0] : params?.sid;
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [hdr, setHdr] = useState<StagingHeader | null>(null);
  const [units, setUnits] = useState<StagingUnit[]>([]);
  const [hideProcessed, setHideProcessed] = useState(true);
  const [working, setWorking] = useState<string | null>(null); // unitId or 'all'

  useEffect(() => {
    if (!stagingId || !isAdmin) return;

    const unsubHdr = onSnapshot(doc(db, 'stagingInvoices', stagingId), (snap) => {
      setHdr({ id: snap.id, ...(snap.data() as any) });
    });

    const qUnits = query(collection(db, 'stagingInvoices', stagingId, 'units'), orderBy('createdAt', 'asc'));
    const unsubUnits = onSnapshot(qUnits, (qs) => {
      setUnits(qs.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as StagingUnit)));
    });

    return () => { unsubHdr(); unsubUnits(); };
  }, [stagingId, isAdmin]);

  const processedCount = useMemo(() => units.filter((u) => u.processed === true).length, [units]);
  const remaining = Math.max(0, units.length - processedCount);
  const filtered = useMemo(() => (hideProcessed ? units.filter((u) => !u.processed) : units), [units, hideProcessed]);

  const processUnit = async (unitId: string) => {
    try {
      const fn = httpsCallable(functions, 'createJacketFromUnit');
      const { data } = await fn({ stagingId: sid, unitId });
      const vin = (data as any)?.vin || ((data as any)?.path || '').split('/').pop();
      if (!vin) throw new Error('Jacket created, but VIN missing in response.');
      toast.success(`Jacket ${vin} created`);
      router.push(`/admin/jackets/${vin}`); // <-- route to the jacket detail screen
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to process unit');
    }
  };

  async function createAllRemaining() {
    try {
      setWorking('all');
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions(undefined, 'us-central1');
      const callable = httpsCallable(functions, 'createJacketsForInvoice');
      const resp: any = await callable({ stagingId });
      const created = resp?.data?.created ?? 0;
      toast({ title: 'Batch complete', description: `Created ${created} jacket(s).` });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Batch failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  }

  if (authLoading || !isAdmin || !stagingId) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="items-start">
          <CardTitle>Staged Invoice: {stagingId}</CardTitle>

          <CardDescription className="space-y-1">
            <div>
              <span className="font-medium">Source:</span>{' '}
              {(hdr?.source || 'N/A').toString().toUpperCase()}
              {'  '}|{'  '}
              <span className="font-medium">Auction #:</span>{' '}
              {hdr?.invoiceMeta?.aucNo || 'N/A'}
              {'  '}|{'  '}
              <span className="font-medium">Invoice Date:</span>{' '}
              {formatInvoiceDate(hdr)}
              {'  '}|{'  '}
              <span className="font-medium">Created:</span>{' '}
              {hdr?.createdAt?.toDate ? hdr.createdAt.toDate().toLocaleString() : 'N/A'}
            </div>

            {hdr?.invoiceMeta?.saleLocation ? (
              <div>
                <span className="font-medium">Location:</span>{' '}
                {hdr.invoiceMeta.saleLocation}
              </div>
            ) : null}
          </CardDescription>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Units: {units.length}</Badge>
            <Badge variant="secondary">Processed: {processedCount}</Badge>
            <Badge variant="secondary">Remaining: {remaining}</Badge>

            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" onClick={createAllRemaining} disabled={working === 'all' || remaining === 0}>
                {working === 'all' ? 'Creating…' : 'Create All Remaining'}
              </Button>

              {hdr?.fileUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={hdr.fileUrl} target="_blank" rel="noopener noreferrer">View Original</a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox id="hide-processed" checked={hideProcessed} onCheckedChange={(checked) => setHideProcessed(Boolean(checked))}/>
            <Label htmlFor="hide-processed">Hide processed units</Label>
          </div>

          <div className="text-sm text-muted-foreground mb-3">
            The following units were extracted from the invoice.
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VIN / Stock #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const desc = [u.year, u.make, u.model].filter(Boolean).join(' ');
                return (
                  <TableRow key={u.id}>
                    <TableCell className="align-top">
                      <div className="font-semibold font-mono">{u.vin || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.stockNo ? `Stock: ${u.stockNo}` : 'Stock: —'}</div>
                      <div className="text-xs text-muted-foreground">{u.titleInfo ? `Title: ${u.titleInfo}` : 'Title: —'}</div>
                    </TableCell>
                    <TableCell className="align-top">{desc || '—'}</TableCell>
                    <TableCell className="align-top">
                      <div>Price: {currency(u.itemPrice)}</div>
                      <div>Buyer Fee: {currency(u.buyerFee)}</div>
                      <div>Online Fee: {currency(u.onlineFee)}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={u.processed ? 'default' : 'outline'}>
                        {u.processed ? 'Processed' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Button size="sm" onClick={() => createOne(u.id)} disabled={!!u.processed || working === u.id}>
                        {working === u.id ? 'Creating…' : 'Create Jacket'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    {hideProcessed ? 'No unprocessed units in this batch.' : 'No units found in this batch.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
