
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { httpsCallableClient } from '@/lib/firebase/client';
import { db } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSafeSnapshot } from '@/hooks/useSafeSnapshot';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

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
    processed?: boolean;
}

interface StagingInvoice {
    createdAt?: Timestamp;
    source?: string;
    aucNo?: string;
    fileUrl?: string;
    rawText?: string;
    status?: 'new' | 'in-progress' | 'processed';
}

export default function StagedInvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { isAdmin, loading: authLoading } = useAuth();
    const sid = params.sid as string;

    const [invoice, setInvoice] = useState<StagingInvoice | null>(null);
    const [units, setUnits] = useState<StagedUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingUnitId, setProcessingUnitId] = useState<string | null>(null);
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [hideProcessed, setHideProcessed] = useState(true);

    useSafeSnapshot(() => {
        if (!isAdmin || !sid) {
            if (!authLoading) setLoading(false);
            return;
        }

        const invoiceRef = doc(db, 'stagingInvoices', sid);
        return onSnapshot(invoiceRef, (invoiceSnap) => {
            if (!invoiceSnap.exists()) {
                toast({ title: 'Error', description: 'Staged invoice not found.', variant: 'destructive' });
                router.push('/admin/staging/invoices');
                return;
            }
            setInvoice(invoiceSnap.data() as StagingInvoice);
            setError(null);
            setLoading(false);
        }, (err) => {
            setError(err.code === 'permission-denied' ? "You don't have permission to view this." : "Failed to load invoice details.");
            setLoading(false);
        });

    }, [sid, isAdmin, authLoading, router, toast]);

    useSafeSnapshot(() => {
        if (!isAdmin || !sid) return;

        const unitsRef = collection(db, 'stagingInvoices', sid, 'units');
        return onSnapshot(unitsRef, (unitsSnap) => {
            const unitsData = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StagedUnit));
            setUnits(unitsData);
        }, (err) => {
            setError(err.code === 'permission-denied' ? "You don't have permission to view units." : "Failed to load units.");
        });

    }, [sid, isAdmin]);

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
                setUnits(prev => prev.map(u => u.id === unitId ? {...u, processed: true} : u));
            } else {
                 throw new Error("Function reported failure.");
            }
        } catch (error: any) {
             toast({ title: 'Jacket Creation Failed', description: error.message, variant: 'destructive' });
        } finally {
            setProcessingUnitId(null);
        }
    };
    
    const handleCreateAllRemaining = async () => {
        setIsProcessingAll(true);
        try {
            const createAll = await httpsCallableClient<{ stagingId: string }, { success: boolean, created: number }>('createJacketsForInvoice');
            const result = await createAll({ stagingId: sid });

            if (result.data.success) {
                 toast({
                    title: 'Batch Creation Complete!',
                    description: `${result.data.created} jacket(s) were created.`,
                });
                setUnits(prev => prev.map(u => u.vin ? {...u, processed: true} : u));
            } else {
                throw new Error("Batch creation function failed.");
            }
        } catch (error: any) {
             toast({ title: 'Batch Creation Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessingAll(false);
        }
    };

    const metrics = useMemo(() => {
        const total = units.length;
        const processed = units.filter(u => u.processed).length;
        const remaining = total - processed;
        return { total, processed, remaining };
    }, [units]);

    const filteredUnits = useMemo(() => {
        if (!hideProcessed) return units;
        return units.filter(u => !u.processed);
    }, [units, hideProcessed]);

    const fmtCurrency = (n?: number): string => (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });


    if (loading || authLoading) {
        return <div><Skeleton className="h-96 w-full" /></div>;
    }

    if (!isAdmin) {
        return <p className="text-muted-foreground p-4">Admin access required.</p>;
    }
    
    if (error) {
        return <div className="p-4 text-sm text-red-600">{error}</div>;
    }


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-3">
                                Staged Invoice: {sid}
                                {invoice?.status === 'processed' && <Badge><Check className="mr-1 h-4 w-4"/>Processed</Badge>}
                            </CardTitle>
                            <CardDescription>
                                Source: {invoice?.source?.toUpperCase() || 'N/A'} | Auction #: {invoice?.aucNo || 'N/A'} | Created: {invoice?.createdAt?.toDate().toLocaleString() ?? 'N/A'}
                            </CardDescription>
                            <div className="flex items-center gap-4 mt-2">
                                <Badge variant="secondary">Units: {metrics.total}</Badge>
                                <Badge variant="default">Processed: {metrics.processed}</Badge>
                                <Badge variant="outline">Remaining: {metrics.remaining}</Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {metrics.remaining > 0 && (
                                 <Button onClick={handleCreateAllRemaining} disabled={isProcessingAll}>
                                    {isProcessingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Create All Remaining
                                 </Button>
                            )}
                            {invoice?.fileUrl && (
                                <Button asChild variant="secondary">
                                    <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" /> View Original
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Parsed Units</CardTitle>
                                    <CardDescription>The following units were extracted from the invoice.</CardDescription>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="hide-processed-units"
                                        checked={hideProcessed}
                                        onCheckedChange={(checked) => setHideProcessed(Boolean(checked))}
                                    />
                                    <Label htmlFor="hide-processed-units">Hide processed units</Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
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
                                    {filteredUnits.length > 0 ? filteredUnits.map((unit) => (
                                        <TableRow key={unit.id} className={unit.processed ? 'bg-muted/50' : ''}>
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
                                            <TableCell>
                                                {unit.processed && <Badge variant="secondary">Processed</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!unit.processed && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCreateJacket(unit.id)}
                                                        disabled={!unit.vin || processingUnitId === unit.id || isProcessingAll}
                                                    >
                                                        {processingUnitId === unit.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : null}
                                                        Create Jacket
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                {hideProcessed ? "All units from this invoice have been processed." : "No units found in this staged invoice."}
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
