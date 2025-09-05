
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { httpsCallableClient } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';

export default function DealerManagementClient() {
    const [pendingDealers, setPendingDealers] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "users"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const dealersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingDealers(dealersData);
        });
        return () => unsubscribe();
    }, []);

    const handleApplication = async (uid: string, action: 'approve' | 'deny') => {
        try {
            const manageDealerApplication = await httpsCallableClient('manageDealerApplication');
            await manageDealerApplication({ uid, action });
            toast({ title: `Dealer ${action === 'approve' ? 'Approved' : 'Denied'}` });
        } catch (error: any) {
            console.error("Error calling function:", error);
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dealer Management</CardTitle>
                <CardDescription>Review and manage pending dealer applications.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Documents</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingDealers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No pending applications.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pendingDealers.map((dealer) => (
                                <TableRow key={dealer.id}>
                                    <TableCell className="font-medium">{dealer.companyName}</TableCell>
                                    <TableCell>{dealer.contactName}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {dealer.resellCertificateUrl ? (
                                                <Button asChild variant="link" className="p-0 h-auto">
                                                    <a href={dealer.resellCertificateUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="mr-1 h-4 w-4"/>
                                                        Certificate
                                                    </a>
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No Cert.</span>
                                            )}
                                            {dealer.governmentIdUrl ? (
                                                <Button asChild variant="link" className="p-0 h-auto">
                                                    <a href={dealer.governmentIdUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="mr-1 h-4 w-4"/>
                                                        ID
                                                    </a>
                                                </Button>
                                            ) : (
                                                 <span className="text-xs text-muted-foreground">No ID</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" onClick={() => handleApplication(dealer.id, 'approve')}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleApplication(dealer.id, 'deny')}>Deny</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
