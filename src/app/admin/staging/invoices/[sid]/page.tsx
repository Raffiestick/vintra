
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { httpsCallableClient } from '@/lib/firebase/client';
import { db } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface StagedUnit {
    id: string;
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
    itemPrice?: number;
    buyerFee?: number;
    onlineFee?: number;
    stockNo?: string;
    titleInfo?: string;
}

interface StagingInvoice {
    createdAt?: Timestamp;
    source?: string;
    aucNo?: string;
    fileUrl?: string;
    rawText?: string;
}

export default function StagedInvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const sid = params.sid as string;

    const [invoice, setInvoice] = useState<StagingInvoice | null>(null);
    const [units, setUnits] = useState<StagedUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingUnitId, setProcessingUnitId] = useState<string | null>(null);

    useEffect(() => {
        if (!sid) return;

        const fetchDetails = async () => {
            try {
                const invoiceRef = doc(db, 'stagingInvoices', sid);
                const invoiceSnap = await getDoc(invoiceRef);

                if (!invoiceSnap.exists()) {
                    toast({ title: 'Error', description: 'Staged invoice not found.', variant: 'destructive' });
                    router.push('/admin/staging/invoices');
                    return;
                }
                setInvoice(invoiceSnap.data() as StagingInvoice);

                const unitsRef = collection(db, 'stagingInvoices', sid, 'units');
                const unitsSnap = await getDocs(unitsRef);
                const unitsData = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StagedUnit));
                setUnits(unitsData);

            } catch (error: any) {
                console.error("Error fetching staged invoice details:", error);
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [sid, router, toast]);

    const handleCreateJacket = async (unitId: string) => {
        setProcessingUnitId(unitId);
        try {
            const createJacket = await httpsCallableClient<{ stagingId: string, unitId: string }, { success: boolean, path: string }>('createJacketFromUnit');
            const result = await createJacket({ stagingId: sid, unitId });
            
            if (result.data.success) {
                const vin = result.data.path.split('/').pop();
                toast({
                    title: 'Jacket Created!',
                    description: (
                        <p>
                            Jacket for VIN {vin} has been successfully created.
                            <Link href={`/admin/jackets/${vin}`} className="font-bold underline ml-2">
                                Open Jacket
                            </Link>
                        </p>
                    ),
                    duration: 10000,
                });
            } else {
                 throw new Error("Function reported failure.");
            }
        } catch (error: any) {
             toast({ title: 'Jacket Creation Failed', description: error.message, variant: 'destructive' });
        } finally {
            setProcessingUnitId(null);
        }
    };
    
    const fmtCurrency = (n?: number): string => (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });


    if (loading) {
        return <div><Skeleton className="h-96 w-full" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Staged Invoice: {sid}</CardTitle>
                            <CardDescription>
                                Source: {invoice?.source?.toUpperCase() || 'N/A'} | Auction #: {invoice?.aucNo || 'N/A'} | Created: {invoice?.createdAt?.toDate().toLocaleString() ?? 'N/A'}
                            </CardDescription>
                        </div>
                        {invoice?.fileUrl && (
                             <Button asChild variant="secondary">
                                <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" /> View Original
                                </a>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Card>
                        <CardHeader>
                            <CardTitle>Parsed Units</CardTitle>
                            <CardDescription>The following units were extracted from the invoice.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>VIN / Stock #</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Fees</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {units.length > 0 ? units.map((unit) => (
                                        <TableRow key={unit.id}>
                                            <TableCell>
                                                <p className="font-mono font-medium">{unit.vin || 'NO VIN'}</p>
                                                <p className="text-xs text-muted-foreground">Stock: {unit.stockNo || 'N/A'}</p>
                                                <p className="text-xs text-muted-foreground">Title: {unit.titleInfo || 'N/A'}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p>{[unit.year, unit.make, unit.model].filter(Boolean).join(' ')}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p>Price: {fmtCurrency(unit.itemPrice)}</p>
                                                <p>Buyer Fee: {fmtCurrency(unit.buyerFee)}</p>
                                                <p>Online Fee: {fmtCurrency(unit.onlineFee)}</p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleCreateJacket(unit.id)}
                                                    disabled={!unit.vin || processingUnitId === unit.id}
                                                >
                                                    {processingUnitId === unit.id ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : null}
                                                    Create Jacket
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No units found in this staged invoice.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {invoice?.rawText && (
                        <Card className="mt-4">
                            <CardHeader><CardTitle>Raw OCR Text</CardTitle></CardHeader>
                            <CardContent>
                                <pre className="text-xs bg-muted p-4 rounded-md max-h-96 overflow-auto">
                                    <code>{invoice.rawText}</code>
                                </pre>
                            </CardContent>
                        </Card>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

