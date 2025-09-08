
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase/client"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { User } from "firebase/auth";
import { Progress } from "@/components/ui/progress";


export default function UploadDocumentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/'); // Redirect if not logged in
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  const uploadFile = (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleUpload = async () => {
    if (!certFile || !idFile || !user) {
      setError("Please select both files to upload.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const userDocRef = doc(db, "users", user.uid);

      toast({ title: "Uploading Resale Certificate..." });
      const certPath = `user-documents/${user.uid}/resale-certificate-${Date.now()}-${certFile.name}`;
      const certUrl = await uploadFile(certFile, certPath);
      await updateDoc(userDocRef, { resellCertificateUrl: certUrl });
      toast({ title: "Certificate Uploaded Successfully" });

      toast({ title: "Uploading Government ID..." });
      const idPath = `user-documents/${user.uid}/government-id-${Date.now()}-${idFile.name}`;
      const idUrl = await uploadFile(idFile, idPath);
      await updateDoc(userDocRef, { governmentIdUrl: idUrl });
      toast({ title: "Government ID Uploaded Successfully" });
      
      await updateDoc(userDocRef, { documentsUploaded: true });
      
      toast({ title: "All documents uploaded!", description: "Redirecting you now..."});
      router.push("/pending-review");

    } catch (err: any) {
      console.error("Upload process failed:", err);
      setError(`Upload failed: ${err.message}`);
      toast({ title: "Upload Failed", description: err.message, variant: "destructive"});
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>Please provide your Resale Certificate and a Government ID to complete your application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resale-cert">Resale Certificate (PDF, PNG, JPG)</Label>
            <Input id="resale-cert" type="file" onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} disabled={uploading}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gov-id">Government ID (PDF, PNG, JPG)</Label>
            <Input id="gov-id" type="file" onChange={(e) => setIdFile(e.target.files ? e.target.files[0] : null)} disabled={uploading}/>
          </div>
          
          {uploading && <Progress value={uploadProgress} className="w-full" />}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleUpload} disabled={uploading || !certFile || !idFile} className="w-full">
            {uploading ? "Uploading..." : "Submit Documents"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
