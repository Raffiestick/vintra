"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, storage, httpsCallableClient } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

/**
 * Inline upload for Auction Invoice:
 *  - create stagingInvoices/{sid}
 *  - upload file -> Storage: stagingInvoices/{sid}/{filename}
 *  - write sourceUrl/sourcePath on doc
 *  - call createJacketsForInvoice({ sid })
 *  - goto /admin/jackets/{vin} on success, else /admin/staging/invoices/{sid}
 */
export default function UploadAuctionInvoiceInline() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const onUpload = async () => {
    if (!file) {
      toast({ title: "Pick a file", description: "Choose a PDF or image.", variant: "destructive" });
      return;
    }
    // Basic type guard
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImg = /^image\//i.test(file.type);
    if (!isPdf && !isImg) {
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

      // 2) upload to storage
      const path = `stagingInvoices/${sid}/${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", undefined, reject, () => resolve());
      });

      const url = await getDownloadURL(storageRef);

      // 3) write url/path to staging doc
      await updateDoc(doc(db, "stagingInvoices", sid), {
        sourceUrl: url,
        sourcePath: path,
        parseStatus: "uploaded",
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Uploaded", description: "Invoice uploaded. Parsing…" });

      // 4) call your parser/creator callable
      const createJacketsForInvoice = httpsCallableClient("createJacketsForInvoice");
      const res: any = await createJacketsForInvoice({ sid });

      const vin =
        res?.data?.vin ||
        res?.data?.jacketVin ||
        (Array.isArray(res?.data?.vins) ? res.data.vins[0] : null);

      if (vin) {
        toast({ title: "Jacket created", description: `VIN ${vin}` });
        // 5) go to jacket detail
        router.push(`/admin/jackets/${encodeURIComponent(vin)}`);
      } else {
        toast({
          title: "Parse complete",
          description: "No VIN returned. Review the staging detail.",
        });
        router.push(`/admin/staging/invoices/${sid}`);
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Upload/Parse failed",
        description: e?.message ?? "Unexpected error",
        variant: "destructive",
      });
      if (sid) router.push(`/admin/staging/invoices/${sid}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="text-sm text-white/80 mb-2">
        Upload an Auction Invoice (PDF or image). We’ll parse it and create a Jacket.
      </div>
      <Input type="file" accept="application/pdf,image/*" onChange={onChoose} />
      <div className="flex gap-2 mt-3">
        <Button onClick={onUpload} disabled={!file || pending}>
          {pending ? "Uploading…" : "Upload & Parse"}
        </Button>
      </div>
    </div>
  );
}
