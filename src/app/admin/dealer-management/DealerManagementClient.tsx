'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { httpsCallableClient } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
            <CardHeader><CardTitle>Dealer Management</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingDealers.map((dealer) => (
                            <TableRow key={dealer.id}>
                                <TableCell>{dealer.companyName}</TableCell>
                                <TableCell>{dealer.contactName}</TableCell>
                                <TableCell className="space-x-2">
                                    <Button onClick={() => handleApplication(dealer.id, 'approve')}>Approve</Button>
                                    <Button variant="destructive" onClick={() => handleApplication(dealer.id, 'deny')}>Deny</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
