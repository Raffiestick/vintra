
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface StagedInvoice {
    id: string;
    createdAt: Timestamp;
    source?: string;
    aucNo?: string;
    fileUrl?: string;
    unitsCount: number;
    status?: 'new' | 'in-progress' | 'processed';
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
                            {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function StagedInvoicesPage() {
    const [invoices, setInvoices] = useState<StagedInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [hideProcessed, setHideProcessed] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const q = query(collection(db, 'stagingInvoices'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                
                const invoicesData = await Promise.all(querySnapshot.docs.map(async (doc) => {
                    const unitsCollection = collection(db, 'stagingInvoices', doc.id, 'units');
                    const unitsSnapshot = await getDocs(unitsCollection);
                    return {
                        id: doc.id,
                        ...doc.data(),
                        unitsCount: unitsSnapshot.size
                    } as StagedInvoice;
                }));

                setInvoices(invoicesData);
            } catch (error) {
                console.error("Error fetching staged invoices:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, []);

    const filteredInvoices = useMemo(() => {
        if (!hideProcessed) return invoices;
        return invoices.filter(invoice => invoice.status !== 'processed');
    }, [invoices, hideProcessed]);

    const getStatus = (invoice: StagedInvoice) => {
        if (invoice.status) return invoice.status;
        return invoice.unitsCount > 0 ? 'in-progress' : 'new';
    }

    if (loading) {
        return <StagingSkeleton />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Staged Invoices</CardTitle>
                    <CardDescription>
                        Invoices that have been automatically parsed and are ready for review.
                    </CardDescription>
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

                    {filteredInvoices.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date Uploaded</TableHead>
                                    <TableHead>Source / Auc #</TableHead>
                                    <TableHead>Units</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            {invoice.createdAt?.toDate().toLocaleString() ?? 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium uppercase">{invoice.source || 'N/A'}</span>
                                                <span className="text-xs text-muted-foreground">{invoice.aucNo || '—'}</span>
                                            </div>
                                        </TableCell>
                                         <TableCell>
                                            <Badge variant="secondary">{invoice.unitsCount}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatus(invoice) === 'processed' ? 'default' : 'outline'} className="capitalize">
                                                {getStatus(invoice)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/admin/staging/invoices/${invoice.id}`)}
                                            >
                                                Open
                                            </Button>
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
                            <Button variant="link" onClick={() => router.push('/admin/jackets/new')}>
                                Upload an Invoice
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
