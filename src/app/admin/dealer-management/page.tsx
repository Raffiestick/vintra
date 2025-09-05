'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import { getClientFunctions } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Dealer {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    resellCertificateUrl?: string;
    governmentIdUrl?: string;
}

export default function DealerManagementPage() {
    const [pendingDealers, setPendingDealers] = useState<Dealer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "users"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const dealers: Dealer[] = [];
            querySnapshot.forEach((doc) => {
                dealers.push({ id: doc.id, ...doc.data() } as Dealer);
            });
            setPendingDealers(dealers);
            setIsLoading(false);
        });
        return () => unsubscribe(); // Cleanup listener on component unmount
    }, []);

    const handleApplication = async (uid: string, action: 'approve' | 'deny') => {
        try {
            const functions = await getClientFunctions();
            if (!functions) return;

            const manageDealerApplication = httpsCallable(functions, 'manageDealerApplication');
            await manageDealerApplication({ uid, action });
            toast({
                title: `Dealer ${action === 'approve' ? 'Approved' : 'Denied'}`,
                description: `The dealer application has been successfully updated.`,
            });
        } catch (error: any) {
            console.error(`Error ${action}ing dealer:`, error);
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };
    
    // ... (Your JSX for displaying the table of dealers goes here)
}