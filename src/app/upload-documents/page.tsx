"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase/client"; // Correctly import initialized services
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { User } from "firebase/auth";

export default function UploadDocumentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  const handleUpload = async () => {
    if (!certFile || !idFile || !user) {
      setError("Please select both files to upload.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const userDocRef = doc(db, "users", user.uid);

      // Upload Resale Certificate
      const certRef = ref(storage, `dealer-documents/${user.uid}/resale-certificate`);
      await uploadBytes(certRef, certFile);
      const certUrl = await getDownloadURL(certRef);
      await updateDoc(userDocRef, { resellCertificateUrl: certUrl });

      // Upload Government ID
      const idRef = ref(storage, `dealer-documents/${user.uid}/government-id`);
      await uploadBytes(idRef, idFile);
      const idUrl = await getDownloadURL(idRef);
      await updateDoc(userDocRef, { governmentIdUrl: idUrl });
      
      // Final update and redirect
      await updateDoc(userDocRef, { documentsUploaded: true });
      router.push("/pending-review");

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setUploading(false);
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
            <Input id="resale-cert" type="file" onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gov-id">Government ID (PDF, PNG, JPG)</Label>
            <Input id="gov-id" type="file" onChange={(e) => setIdFile(e.target.files ? e.target.files[0] : null)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleUpload} disabled={uploading || !certFile || !idFile} className="w-full">
            {uploading ? "Uploading..." : "Submit Documents"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}