
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Loader2, UploadCloud } from "lucide-react";

export default function UploadDocumentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [certProgress, setCertProgress] = useState(0);
  const [idProgress, setIdProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/"); // Redirect if not logged in
      }
    });
    return () => unsubscribe();
  }, [router]);

  const uploadFile = (
    file: File,
    path: string,
    onProgress: (progress: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          console.error("Upload failed for path:", path, error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error("Failed to get download URL:", error);
            reject(error);
          }
        }
      );
    });
  };

  const handleUpload = useCallback(async () => {
    if (!certFile || !idFile || !user) {
      setError("Please select both files to upload.");
      return;
    }

    setUploading(true);
    setError("");
    toast({ title: "Starting document upload..." });

    try {
      const certPath = `user-documents/${user.uid}/resale-certificate-${Date.now()}-${certFile.name}`;
      const idPath = `user-documents/${user.uid}/government-id-${Date.now()}-${idFile.name}`;

      const [certUrl, idUrl] = await Promise.all([
        uploadFile(certFile, certPath, setCertProgress),
        uploadFile(idFile, idPath, setIdProgress),
      ]);

      toast({
        title: "Uploads Complete",
        description: "Updating your profile.",
      });

      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        resellCertificateUrl: certUrl,
        governmentIdUrl: idUrl,
        documentsUploaded: true,
        status: "pending",
      });

      toast({
        title: "Profile updated successfully!",
        description: "Redirecting you now...",
      });
      
      router.push("/pending-review");

    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Upload process failed:", err);
      setError(`Upload failed: ${errorMessage}`);
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [certFile, idFile, user, router, toast]);

  const handleSubmit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    handleUpload();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Please provide your Resale Certificate and a Government ID to
            complete your application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resale-cert">Resale Certificate (PDF, PNG, JPG)</Label>
            <Input
              id="resale-cert"
              type="file"
              onChange={(e) =>
                setCertFile(e.target.files ? e.target.files[0] : null)
              }
              disabled={uploading}
              accept="application/pdf,image/png,image/jpeg"
            />
            {uploading && certFile && (
              <div className="flex items-center gap-2 pt-1">
                <Progress value={certProgress} className="w-full h-2" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(certProgress)}%
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gov-id">Government ID (PDF, PNG, JPG)</Label>
            <Input
              id="gov-id"
              type="file"
              onChange={(e) =>
                setIdFile(e.target.files ? e.target.files[0] : null)
              }
              disabled={uploading}
               accept="application/pdf,image/png,image/jpeg"
            />
            {uploading && idFile && (
              <div className="flex items-center gap-2 pt-1">
                <Progress value={idProgress} className="w-full h-2" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(idProgress)}%
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={uploading || !certFile || !idFile}
            className="w-full"
          >
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4"/>Submit Documents</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    