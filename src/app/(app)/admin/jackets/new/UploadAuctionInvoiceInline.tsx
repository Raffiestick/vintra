"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, storage, httpsCallableClient } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function UploadAuctionInvoiceInline() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setProgress(0);
  };

  const onUpload = async () => {
    if (!file) {
      toast({ title: "Pick a file", description: "Choose a PDF or image.", variant: "destructive" });
      return;
    }
    const okType = /pdf|image\//i.test(file.type) || /\.pdf$/i.test(file.name);
    if (!okType) {
      toast({ title: "Unsupported file", description: "Upload a PDF or image.", variant: "destructive" });
      return;
    }

    setPending(true);
    let sid = "";
    try {
      // 1) create staging doc
      const stagingRef = await addDoc(collection(db, "stagingInvoices"), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        parseStatus: "new",
        originalFilename: file.name,
      });
      sid = stagingRef.id;
      console.log("[upload] staging sid:", sid);

      // 2) upload to storage (with progress)
      const path = `stagingInvoices/${sid}/${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const url = await getDownloadURL(storageRef);
      console.log("[upload] uploaded ->", url);

      // 3) write url to staging
      await updateDoc(doc(db, "stagingInvoices", sid), {
        sourceUrl: url,
        sourcePath: path,
        parseStatus: "uploaded",
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Uploaded", description: `File uploaded (${progress || 100}%). Parsing…` });

      // 4) call parser
      const createJacketsForInvoice = httpsCallableClient("createJacketsForInvoice");
      const res: any = await createJacketsForInvoice({ sid });
      console.log("[parse] result:", res?.data);

      const vin =
        res?.data?.vin ||
        res?.data?.jacketVin ||
        (Array.isArray(res?.data?.vins) ? res.data.vins[0] : null);

      if (vin) {
        toast({ title: "Jacket created", description: `VIN ${vin}` });
        router.push(`/admin/jackets/${encodeURIComponent(vin)}`);
      } else {
        toast({ title: "Parse complete", description: "Review the staging detail." });
        router.push(`/admin/staging/invoices/${sid}`);
      }
    } catch (e: any) {
      console.error("[upload] error:", e);
      toast({
        title: "Upload/Parse failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
      if (sid) router.push(`/admin/staging/invoices/${sid}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="panel p-4 space-y-3">
      <div className="text-sm text-white/80">
        Upload an Auction Invoice (PDF or image). We’ll parse it and create a Jacket.
      </div>
      <Input type="file" accept="application/pdf,image/*" onChange={onChoose} className="input-like" />
      {pending && <div className="text-xs text-white/60">Uploading… {progress}%</div>}
      <div className="flex gap-2">
        <Button onClick={onUpload} disabled={!file || pending} className="btn-primary">
          {pending ? "Working…" : "Upload & Parse"}
        </Button>
      </div>
    </div>
  );
}
