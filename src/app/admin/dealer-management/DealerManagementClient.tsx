
'use client';

import { useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { httpsCallableClient } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { useSafeSnapshot } from '@/hooks/useSafeSnapshot';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

function DealerManagementSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
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
  )
}

export default function DealerManagementClient() {
    const { isAdmin, loading: authLoading } = useAuth();
    const [pendingDealers, setPendingDealers] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useSafeSnapshot(() => {
        // Prevent snapshot listener setup until authentication status is resolved.
        if (authLoading) return;

        if (!isAdmin) {
            setLoadingData(false);
            setError("You don't have permission to view this page.");
            return;
        };

        const q = query(collection(db, "users"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const dealersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingDealers(dealersData);
            setLoadingData(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching pending dealers: ", err);
            setError(err.code === 'permission-denied' ? "You don't have permission to view this." : "Failed to load pending dealers.");
            setLoadingData(false);
        });

        return unsubscribe;
    }, [isAdmin, authLoading]);

    const handleApplication = async (uid: string, action: 'approve' | 'deny') => {
        try {
            const manageDealerApplication = httpsCallableClient('manageDealerApplication');
            await manageDealerApplication({ uid, action });
            toast({ title: `Dealer ${action === 'approve' ? 'Approved' : 'Denied'}` });
        } catch (error: any) {
            console.error("Error calling function:", error);
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        }
    };
    
    if (authLoading || loadingData) {
        return <DealerManagementSkeleton />;
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }

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
                            <TableHead>Business Name</TableHead>
                            <TableHead>Contact Name</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Documents</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingDealers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No pending applications.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pendingDealers.map((dealer) => (
                                <TableRow key={dealer.id}>
                                    <TableCell className="font-medium">{dealer.companyName}</TableCell>
                                    <TableCell>{dealer.contactName}</TableCell>
                                    <TableCell>{dealer.phone}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {dealer.resellCertificateUrl ? (
                                                <Button asChild variant="outline" size="sm">
                                                    <a href={dealer.resellCertificateUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="mr-2 h-4 w-4"/>
                                                        Tax Resell Cert
                                                    </a>
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No Cert.</span>
                                            )}
                                            {dealer.governmentIdUrl ? (
                                                <Button asChild variant="outline" size="sm">
                                                    <a href={dealer.governmentIdUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="mr-2 h-4 w-4"/>
                                                        Gov ID
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
