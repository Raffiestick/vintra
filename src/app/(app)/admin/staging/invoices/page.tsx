"use client";

import { useState, useMemo } from 'react';
import { collection, query, orderBy, Timestamp, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useSafeSnapshot } from '@/hooks/useSafeSnapshot';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";


interface StagingHeader {
  id: string;
  createdAt?: Timestamp;
  unitsCount: number;
  status?: 'new' | 'in-progress' | 'processed';
  fileName?: string;
  auctionSaleDate?: Timestamp | null;
  auctionInvoiceNumber?: string | null;
}

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString('en-US', { timeZone: 'UTC' });
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
              {[...Array(7)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}
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
  
  // State for new search inputs
  const [searchDate, setSearchDate] = useState('');
  const [searchInvoiceNum, setSearchInvoiceNum] = useState('');

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

  // Updated filtering logic to include search
  const filteredInvoices = useMemo(() => {
    let tempInvoices = invoices;

    if (hideProcessed) {
      tempInvoices = tempInvoices.filter(i => getStatus(i) !== 'processed');
    }

    if (searchDate) {
      tempInvoices = tempInvoices.filter(i => {
        if (!i.auctionSaleDate) return false;
        // Format Firestore Timestamp to 'YYYY-MM-DD' for comparison
        const date = i.auctionSaleDate.toDate();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === searchDate;
      });
    }

    if (searchInvoiceNum) {
      tempInvoices = tempInvoices.filter(i =>
        i.auctionInvoiceNumber?.toLowerCase().includes(searchInvoiceNum.toLowerCase())
      );
    }

    return tempInvoices;
  }, [invoices, hideProcessed, searchDate, searchInvoiceNum]);

  async function handleProcessAll(stagingId: string) {
    // ... (unchanged)
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
          {/* New Search and Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4 p-4 border rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search-inv-num">Search by Invoice #</Label>
              <Input id="search-inv-num" placeholder="Enter invoice number..." value={searchInvoiceNum} onChange={(e) => setSearchInvoiceNum(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search-date">Filter by Invoice Date</Label>
              <Input type="date" id="search-date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="hide-processed"
                checked={hideProcessed}
                onCheckedChange={(checked) => setHideProcessed(Boolean(checked))}
              />
              <Label htmlFor="hide-processed">Hide processed</Label>
            </div>
          </div>

          {filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Upload Time</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.createdAt?.toDate().toLocaleString() ?? 'N/A'}</TableCell>
                    <TableCell>{formatDate(h.auctionSaleDate)}</TableCell>
                    <TableCell>{h.auctionInvoiceNumber || '—'}</TableCell>
                    <TableCell>
                      <span className="font-medium">{h.fileName || 'N/A'}</span>
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
                {invoices.length === 0 ? "No invoices are currently in the staging area." : "No invoices found matching your search."}
              </p>
              <Button variant="link" asChild>
                <Link href="/admin/jackets/new">Create a New Batch</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}