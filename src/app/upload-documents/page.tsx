"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { onAuthStateChanged, User } from "firebase/auth";

type UploadStatus = "awaiting" | "uploading" | "complete" | "error";

export default function UploadDocumentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [resaleCertFile, setResaleCertFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [resaleCertStatus, setResaleCertStatus] = useState<UploadStatus>("awaiting");
  const [govIdStatus, setGovIdStatus] = useState<UploadStatus>("awaiting");
  const [resaleCertProgress, setResaleCertProgress] = useState(0);
  const [govIdProgress, setGovIdProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const storage = getStorage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: "resale" | "govId") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileType === "resale") {
      setResaleCertFile(file);
    } else {
      setGovIdFile(file);
    }
  };

  const handleUpload = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to upload documents.", variant: "destructive" });
      return;
    }
    if (!resaleCertFile || !govIdFile) {
        toast({ title: "Missing Files", description: "Please select both documents before submitting.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    const uploadFile = (file: File, path: string, setProgress: (p: number) => void, setStatus: (s: UploadStatus) => void): Promise<string> => {
        return new Promise((resolve, reject) => {
            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(progress);
                    setStatus("uploading");
                },
                (error) => {
                    setStatus("error");
                    toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setStatus("complete");
                    resolve(downloadURL);
                }
            );
        });
    };

    try {
      const resaleExt = resaleCertFile.name.split('.').pop();
      const govIdExt = govIdFile.name.split('.').pop();

      const resalePath = `dealer-documents/${user.uid}/resale-certificate.${resaleExt}`;
      const govIdPath = `dealer-documents/${user.uid}/government-id.${govIdExt}`;

      const resaleCertificateUrl = await uploadFile(resaleCertFile, resalePath, setResaleCertProgress, setResaleCertStatus);
      const governmentIdUrl = await uploadFile(govIdFile, govIdPath, setGovIdProgress, setGovIdStatus);
      
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        resellCertificateUrl: resaleCertificateUrl,
        governmentIdUrl: governmentIdUrl,
        documentsUploaded: true,
      });

      toast({ title: "Success", description: "Documents uploaded successfully. Redirecting..." });
      router.push("/pending-review");

    } catch (error: any) {
      setIsSubmitting(false);
      toast({ title: "An Error Occurred", description: "Something went wrong during the final submission. Please try again.", variant: "destructive" });
    }
  };
  
  const getStatusMessage = (status: UploadStatus, progress: number) => {
    switch (status) {
        case "awaiting": return "Awaiting upload";
        case "uploading": return `Uploading... ${Math.round(progress)}%`;
        case "complete": return "Upload Complete";
        case "error": return "Upload Failed";
    }
  }

  if (!user) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
            <p>Loading user information...</p>
        </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Document Submission</CardTitle>
          <CardDescription>
            To complete your application, please upload the following documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resale-cert">Resale Certificate</Label>
            <Input id="resale-cert" type="file" onChange={(e) => handleFileChange(e, "resale")} disabled={isSubmitting} />
            <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                <p>{getStatusMessage(resaleCertStatus, resaleCertProgress)}</p>
                {resaleCertStatus === 'uploading' && <Progress value={resaleCertProgress} className="w-full h-2" />}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gov-id">Government ID</Label>
            <Input id="gov-id" type="file" onChange={(e) => handleFileChange(e, "govId")} disabled={isSubmitting} />
            <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                <p>{getStatusMessage(govIdStatus, govIdProgress)}</p>
                {govIdStatus === 'uploading' && <Progress value={govIdProgress} className="w-full h-2" />}
            </div>
          </div>
          <Button onClick={handleUpload} disabled={isSubmitting || !resaleCertFile || !govIdFile} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Documents"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
