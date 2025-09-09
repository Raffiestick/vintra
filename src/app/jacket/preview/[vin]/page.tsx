
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { httpsCallableClient, db, storage } from "@/lib/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, CheckCircle, File as FileIcon, Loader2 } from "lucide-react";

interface Jacket {
  vin: string;
  year: number;
  make: string;
  model: string;
  color: string;
  odometer: number;
  titleState: string;
  titleNumber: string;
  auctionInvoiceTotal: number;
  dealerId: string;
  jacketId: string;
  titleUrl?: string; // Add titleUrl field
  createdAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  [key: string]: any;
}

function JacketDetailSkeleton() {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div className="md:col-span-3 border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Vehicle Information</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><strong className="block text-muted-foreground">Color:</strong> <Skeleton className="h-5 w-20 mt-1"/></div>
              <div><strong className="block text-muted-foreground">Odometer:</strong> <Skeleton className="h-5 w-24 mt-1"/></div>
              <div><strong className="block text-muted-foreground">Title State:</strong> <Skeleton className="h-5 w-16 mt-1"/></div>
              <div><strong className="block text-muted-foreground">Title Number:</strong> <Skeleton className="h-5 w-28 mt-1"/></div>
          </div>
        </div>
         <div className="md:col-span-3 border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Financials & Assignment</h4>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><strong className="block text-muted-foreground">Auction Total:</strong> <Skeleton className="h-5 w-24 mt-1"/></div>
              <div className="col-span-2"><strong className="block text-muted-foreground">Assigned Dealer ID:</strong> <Skeleton className="h-5 w-48 mt-1"/></div>
           </div>
        </div>
        <div className="md:col-span-3 border-t pt-6">
           <div className="text-xs text-muted-foreground">
              Created on: <Skeleton className="h-4 w-24 inline-block"/>
           </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
          <Button size="lg" className="w-full md:w-auto" disabled>Process Jacket</Button>
      </CardFooter>
     </Card>
  )
}

export default function JacketDetailPage() {
  const params = useParams();
  const vin = Array.isArray(params.vin) ? params.vin[0] : params.vin;
  const [jacket, setJacket] = useState<Jacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [titleFile, setTitleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!vin) {
      setError("VIN not found in URL.");
      setLoading(false);
      return;
    }

    const jacketDocRef = doc(db, "jackets", vin);
    const unsubscribe = onSnapshot(jacketDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setJacket(docSnap.data() as Jacket);
        setError(null);
      } else {
        setError("Jacket not found.");
        setJacket(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching jacket:", err);
      setError(err.message || "Failed to fetch jacket data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [vin]);

  const handleTitleUpload = useCallback(async () => {
    if (!titleFile || !vin) {
      toast({ title: "Please select a file first.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    toast({ title: "Starting title upload..." });

    const fileExtension = titleFile.name.split('.').pop();
    const storagePath = `jacket-documents/${vin}/title.${fileExtension}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, titleFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const jacketDocRef = doc(db, "jackets", vin);
          await updateDoc(jacketDocRef, { titleUrl: downloadURL });
          
          toast({ title: "Upload Complete!", description: "Vehicle title has been saved." });
        } catch (updateError: any) {
          console.error("Failed to update jacket document:", updateError);
          toast({ title: "Update Failed", description: updateError.message, variant: "destructive" });
        } finally {
          setIsUploading(false);
          setTitleFile(null); // Clear file input after upload
        }
      }
    );
  }, [vin, titleFile, toast]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <JacketDetailSkeleton />
      </main>
    );
  }

  if (error || !jacket) {
     return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-4xl">
           <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">Jacket Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No vehicle jacket was found with the VIN:{" "}
              <span className="font-mono">{vin}</span>.
            </p>
            {error && <p className="text-destructive mt-2">{error}</p>}
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const createdAt = jacket.createdAt?._seconds 
    ? new Date(jacket.createdAt._seconds * 1000).toLocaleDateString() 
    : 'N/A';

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8 gap-8">
       <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">
                {jacket.year} {jacket.make} {jacket.model}
              </CardTitle>
              <CardDescription>
                VIN: <span className="font-mono">{jacket.vin}</span>
              </CardDescription>
            </div>
             <Badge variant="secondary" className="text-lg">
                Jacket ID: {jacket.jacketId}
             </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="md:col-span-3 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">Vehicle Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><strong className="block text-muted-foreground">Color:</strong> {jacket.color}</div>
                <div><strong className="block text-muted-foreground">Odometer:</strong> {jacket.odometer.toLocaleString()}</div>
                <div><strong className="block text-muted-foreground">Title State:</strong> {jacket.titleState}</div>
                <div><strong className="block text-muted-foreground">Title Number:</strong> {jacket.titleNumber}</div>
            </div>
          </div>

           <div className="md:col-span-3 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">Financials & Assignment</h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><strong className="block text-muted-foreground">Auction Total:</strong> ${jacket.auctionInvoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="col-span-2"><strong className="block text-muted-foreground">Assigned Dealer ID:</strong> <span className="font-mono text-xs">{jacket.dealerId}</span></div>
             </div>
          </div>
          <div className="md:col-span-3 border-t pt-6">
             <div className="text-xs text-muted-foreground">
                Created on: {createdAt}
             </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
            <Button size="lg" className="w-full md:w-auto">Process Jacket</Button>
        </CardFooter>
       </Card>

       <Card className="w-full max-w-4xl">
         <CardHeader>
           <CardTitle>Jacket Processing</CardTitle>
           <CardDescription>Upload required documents to process this jacket.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           <div className="space-y-4">
             <Label htmlFor="title-upload" className="font-semibold text-base">Vehicle Title</Label>
             {jacket.titleUrl ? (
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-medium">Title successfully uploaded.</p>
                  <Button asChild variant="link">
                    <a href={jacket.titleUrl} target="_blank" rel="noopener noreferrer">View Title</a>
                  </Button>
                </div>
             ) : (
                <div className="space-y-3">
                  <div className="flex gap-4 items-center">
                    <Input id="title-upload" type="file" onChange={(e) => setTitleFile(e.target.files ? e.target.files[0] : null)} disabled={isUploading} className="max-w-sm"/>
                    <Button onClick={handleTitleUpload} disabled={!titleFile || isUploading}>
                      {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      ) : (
                        <UploadCloud className="mr-2 h-4 w-4"/>
                      )}
                      {isUploading ? 'Uploading...' : 'Upload Title'}
                    </Button>
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-2">
                       <Progress value={uploadProgress} className="w-full max-w-sm h-2" />
                       <span className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</span>
                    </div>
                  )}
                </div>
             )}
           </div>
         </CardContent>
       </Card>
    </main>
  );
}

    