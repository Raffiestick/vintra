
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface ApprovedDealer {
    id: string;
    companyName: string;
    contactName: string;
    phone: string;
    email: string;
    resellCertificateUrl?: string;
    governmentIdUrl?: string;
    createdAt: Timestamp;
}

export default function ApprovedDealersClient() {
    const [approvedDealers, setApprovedDealers] = useState<ApprovedDealer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "users"), where("status", "==", "approved"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const dealersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApprovedDealer));
            setApprovedDealers(dealersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching approved dealers: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const formatDate = (timestamp: Timestamp | null) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Approved Dealers</CardTitle>
                <CardDescription>A list of all dealers with approved applications.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Business Name</TableHead>
                            <TableHead>Contact Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Date Joined</TableHead>
                            <TableHead>Documents</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading approved dealers...
                                </TableCell>
                            </TableRow>
                        ) : approvedDealers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No approved dealers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            approvedDealers.map((dealer) => (
                                <TableRow key={dealer.id}>
                                    <TableCell className="font-medium">{dealer.companyName}</TableCell>
                                    <TableCell>{dealer.contactName}</TableCell>
                                    <TableCell>{dealer.email}</TableCell>
                                    <TableCell>{dealer.phone}</TableCell>
                                    <TableCell>{formatDate(dealer.createdAt)}</TableCell>
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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
