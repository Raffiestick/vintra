"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Import the router
import { useAuth } from '@/hooks/use-auth';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { functions, storage, db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';

const createJacketsForInvoice = httpsCallable(functions, 'createJacketsForInvoice');

export function UploadAuctionInvoiceInline() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter(); // Initialize the router
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('Idle');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !user) return;

        setIsLoading(true);
        setStatus('1/3: Creating staging document...');

        try {
            const stagingRef = await addDoc(collection(db, 'stagingInvoices'), {
                uploaderUid: user.uid,
                fileName: file.name,
                status: 'uploading',
                createdAt: serverTimestamp(),
            });
            const sid = stagingRef.id;
            console.log('[upload] staging sid:', sid);
            
            setStatus('2/3: Uploading file...');
            const storagePath = `stagingInvoices/${sid}/${file.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = await uploadBytesResumable(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);

            await setDoc(doc(db, 'stagingInvoices', sid), { sourceUrl: downloadURL }, { merge: true });

            setStatus('3/3: Triggering parser...');
            await createJacketsForInvoice({ sid });
            
            toast({
                title: "Processing Complete",
                description: "Redirecting to staging page to view results.",
            });
            
            // THIS IS THE FIX: Redirect to the staging page for this invoice
            router.push(`/admin/staging/invoices/${sid}`);

        } catch (error: any) {
            console.error('[upload] error:', error);
            setStatus('Error');
            toast({
                title: "Upload Failed",
                description: error.message || "An unknown error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Upload Auction Invoice</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <Input type="file" onChange={handleFileChange} accept=".pdf,image/*" disabled={isLoading} />
                <Button onClick={handleUpload} disabled={!file || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    {isLoading ? status : 'Upload and Process'}
                </Button>
            </CardContent>
        </Card>
    );
}