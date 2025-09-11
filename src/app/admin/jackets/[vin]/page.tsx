
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  query,
  collection,
  where,
  getDocs,
  deleteField,
  getDoc,
  addDoc,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { useAuth } from "@/hooks/use-auth";
import { db, storage, auth } from "@/lib/firebase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, Download, FileText, Check, ChevronsUpDown, Calendar as CalendarIcon, Trash2, Replace, Printer } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils";
import { format } from "date-fns";


interface MiscFee {
    description: string;
    amount: number;
    createdAt?: Timestamp;
}

interface JacketDocument {
    id: string; // Now mandatory
    name: string;
    type: "title" | "poa" | "addendum";
    url: string;
    createdAt?: Timestamp;
}

interface Jacket {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  odometer?: number;
  jacketId?: string;
  auctionSaleDate?: Timestamp;
  isAuctionPaid?: boolean;
  isMgmtPaid?: boolean; // Legacy field
  isMgmtFeePaid?: boolean; // New field
  itemPrice?: number;
  buyerFee?: number;
  onlineFee?: number;
  managementFee?: number;
  miscFees?: MiscFee[];
  documents?: JacketDocument[];
  invoiceId?: string;
  invoiceUrl?: string;
  bosUrl?: string;
  packetUrl?: string;
  creatorId?: string;
  dealerId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  auctionPaidAt?: Timestamp;
  auctionPaymentRef?: string;
  mgmtPaidAt?: Timestamp;
  mgmtPaymentRef?: string;
}

interface ApprovedDealer {
  uid: string;
  companyName: string;
  contactName: string;
  email: string;
}

type PaymentType = 'auction' | 'mgmt';

interface Activity {
  id: string;
  ts: Timestamp;
  actorUid: string;
  actorEmail?: string;
  actorName?: string;
  type: "assignDealer" | "auctionPaidOn" | "auctionPaidOff" | "mgmtPaidOn" | "mgmtPaidOff" | "miscFeeAdded" | "docAdded" | "docReplaced" | "docDeleted" | "invoiceGenerated" | "bosGenerated" | "packetGenerated";
  message: string;
  meta?: any;
}


async function logActivity(vin: string, entry: Omit<Activity, "id" | "ts" | "actorUid" | "actorEmail" | "actorName"> & { ts?: any }) {
    const user = auth.currentUser;
    if (!user || !vin) return;

    const base = {
        actorUid: user.uid,
        actorEmail: user.email || "",
        actorName: user.displayName || "",
    };
    
    try {
        await addDoc(collection(db, "jackets", vin, "activity"), {
            ...base,
            ...entry,
            ts: entry.ts ?? Timestamp.fromDate(new Date()),
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}

function JacketDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-8">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Financials</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function JacketDetailPage() {
  const params = useParams<{ vin: string | string[] }>();
  const vin = useMemo(
    () => (Array.isArray(params?.vin) ? params.vin[0] : params?.vin),
    [params?.vin]
  );

  const { toast } = useToast();
  const { user, isAdmin } = useAuth(); 

  const [jacket, setJacket] = useState<Jacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoiceUrlLocal, setInvoiceUrlLocal] = useState<string | null>(null);
  const [invoiceIdLocal, setInvoiceIdLocal] = useState<string | null>(null);
  
  const [isGeneratingBos, setIsGeneratingBos] = useState(false);
  const [bosUrlLocal, setBosUrlLocal] = useState<string | null>(null);

  const [isGeneratingPacket, setIsGeneratingPacket] = useState(false);
  const [packetUrlLocal, setPacketUrlLocal] = useState<string | null>(null);


  const [feeDescription, setFeeDescription] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeError, setFeeError] = useState("");
  const [isAddingFee, setIsAddingFee] = useState(false);

  // Document states
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<JacketDocument['type'] | ''>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [docError, setDocError] = useState('');
  const [docToDelete, setDocToDelete] = useState<JacketDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);


  const [approvedDealers, setApprovedDealers] = useState<ApprovedDealer[]>([]);
  const [isEditingDealer, setIsEditingDealer] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState('');
  const [isSavingDealer, setIsSavingDealer] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // State for payment modals
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean, type: PaymentType | null }>({ open: false, type: null });
  const [unpaidConfirmDialog, setUnpaidConfirmDialog] = useState<{ open: boolean, type: PaymentType | null }>({ open: false, type: null });
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentRef, setPaymentRef] = useState("");
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Activity Log State
  const [activityLog, setActivityLog] = useState<Activity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);


  const assignedDealer = useMemo(() => {
    if (!jacket?.dealerId || approvedDealers.length === 0) return null;
    return approvedDealers.find(d => d.uid === jacket.dealerId) || null;
  }, [jacket?.dealerId, approvedDealers]);

  useEffect(() => {
    if (!vin || typeof vin !== "string") {
      setError("VIN not found in URL.");
      setLoading(false);
      return;
    }

    const jacketDocRef = doc(db, "jackets", vin);
    const unsubscribe = onSnapshot(
      jacketDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const jacketData = { vin: docSnap.id, ...docSnap.data() } as Jacket;
          setJacket(jacketData);
          if (!jacketData.dealerId) {
            setIsEditingDealer(true); 
          } else {
            setIsEditingDealer(false);
          }
          setError(null);
        } else {
          setError("Jacket not found.");
          setJacket(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching jacket:", err);
        setError("Failed to fetch jacket data.");
        setLoading(false);
      }
    );
    
    const activityQuery = query(collection(db, "jackets", vin, "activity"), orderBy("ts", "desc"));
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
        setActivityLog(activities);
        setLoadingActivity(false);
    }, (err) => {
        console.error("Error fetching activity log:", err);
        setLoadingActivity(false);
    });


    return () => {
      unsubscribe();
      unsubscribeActivity();
    };
  }, [vin]);

  // One-time migration for isMgmtPaid -> isMgmtFeePaid
  useEffect(() => {
    if (jacket && typeof jacket.isMgmtPaid === 'boolean' && typeof jacket.isMgmtFeePaid === 'undefined') {
        const jacketDocRef = doc(db, "jackets", jacket.vin);
        console.info(`Migrating isMgmtPaid -> isMgmtFeePaid for VIN ${jacket.vin}`);
        updateDoc(jacketDocRef, {
            isMgmtFeePaid: jacket.isMgmtPaid,
            isMgmtPaid: deleteField(),
            updatedAt: serverTimestamp()
        }).catch(err => {
            console.error("One-time migration failed:", err);
        });
    }
  }, [jacket]);

  useEffect(() => {
    if (jacket?.documents && jacket.documents.some(d => !d.id)) {
        console.log(`Migrating documents to add IDs for VIN ${jacket.vin}`);
        const jacketDocRef = doc(db, "jackets", jacket.vin);
        const updatedDocuments = jacket.documents.map((doc, index) => 
            doc.id ? doc : { ...doc, id: `doc-${Date.now()}-${index}` }
        );
        updateDoc(jacketDocRef, {
            documents: updatedDocuments,
            updatedAt: serverTimestamp()
        }).catch(err => {
            console.error("Document ID migration failed:", err);
        });
    }
  }, [jacket?.documents, jacket?.vin]);


  useEffect(() => {
      async function fetchDealers() {
          if (!isAdmin) return;
          try {
              const q = query(collection(db, "users"), where("status", "==", "approved"));
              const querySnapshot = await getDocs(q);
              const dealers = querySnapshot.docs.map(doc => ({
                  uid: doc.id,
                  companyName: doc.data().companyName || 'N/A',
                  contactName: doc.data().contactName || 'N/A',
                  email: doc.data().email || 'N/A'
              } as ApprovedDealer));
              setApprovedDealers(dealers);
          } catch (error) {
              console.error("Failed to fetch dealers:", error);
              toast({ title: "Error", description: "Could not load approved dealers.", variant: "destructive" });
          }
      }
      fetchDealers();
  }, [isAdmin, toast]);

  useEffect(() => {
      if (jacket?.invoiceUrl) setInvoiceUrlLocal(null);
      if(jacket?.invoiceId) setInvoiceIdLocal(null);
      if(jacket?.bosUrl) setBosUrlLocal(null);
      if(jacket?.packetUrl) setPacketUrlLocal(null);
  }, [jacket?.invoiceUrl, jacket?.invoiceId, jacket?.bosUrl, jacket?.packetUrl]);
  
  const handleGenerateInvoice = useCallback(async () => {
    if (!vin || !isAdmin) return;
    setIsGeneratingInvoice(true);
    try {
        const response = await fetch("https://us-central1-rizeup-dealer-connect-n6k7r.cloudfunctions.net/generateJacketInvoice", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vin: vin })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate invoice: ${errorText}`);
        }

        const result = await response.json();
        
        if (result?.url) setInvoiceUrlLocal(result.url);
        if (result?.invoiceId) setInvoiceIdLocal(result.invoiceId);
        
        if (result?.url) {
             toast({
                title: "Invoice Ready!",
                description: (
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                        Click here to open the invoice.
                    </a>
                )
            });
            await logActivity(vin, { type: "invoiceGenerated", message: `Invoice generated ${result?.invoiceId ? " — " + result.invoiceId : ""}`, meta: { invoiceId: result?.invoiceId } });
        } else {
            toast({
                title: "Invoice Generation Started",
                description: "The invoice is being generated and will appear here shortly.",
            });
        }
        
    } catch (err: any) {
        console.error("Error generating invoice:", err);
        toast({
            title: "Invoice Generation Failed",
            description: err.message,
            variant: "destructive",
        });
    } finally {
        setIsGeneratingInvoice(false);
    }
  }, [vin, isAdmin, toast]);


  const handleGenerateBos = useCallback(async () => {
    if (!vin || !isAdmin) return;
    setIsGeneratingBos(true);
    try {
        const response = await fetch("https://us-central1-rizeup-dealer-connect-n6k7r.cloudfunctions.net/generateBillOfSale", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vin: vin })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate Bill of Sale: ${errorText}`);
        }

        const result = await response.json();
        
        if (result?.url) {
            setBosUrlLocal(result.url);
            toast({
                title: "Bill of Sale Ready!",
                description: (
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                        Click here to open the BOS.
                    </a>
                )
            });
            await logActivity(vin, { type: "bosGenerated", message: "Bill of Sale generated", meta: { url: result.url } });
        } else {
            toast({
                title: "BOS Generation Started",
                description: "The Bill of Sale is being generated and will appear here shortly.",
            });
        }
        
    } catch (err: any) {
        console.error("Error generating Bill of Sale:", err);
        toast({
            title: "BOS Generation Failed",
            description: err.message,
            variant: "destructive",
        });
    } finally {
        setIsGeneratingBos(false);
    }
  }, [vin, isAdmin, toast]);


  const handleGeneratePacket = useCallback(async () => {
    if (!vin || !isAdmin) return;
    setIsGeneratingPacket(true);
    try {
        const response = await fetch("https://us-central1-rizeup-dealer-connect-n6k7r.cloudfunctions.net/generateJacketPacket", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vin: vin })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate packet: ${errorText}`);
        }

        const result = await response.json();
        
        if (result?.url) {
            setPacketUrlLocal(result.url);
            toast({
                title: "Jacket Packet Ready!",
                description: (
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                        Click here to open the packet.
                    </a>
                )
            });
            await logActivity(vin, { type: "packetGenerated", message: "Jacket Packet generated", meta: { url: result.url } });
        } else {
            toast({
                title: "Packet Generation Started",
                description: "The jacket packet is being generated and will appear here shortly.",
            });
        }
        
    } catch (err: any) {
        console.error("Error generating jacket packet:", err);
        toast({
            title: "Packet Generation Failed",
            description: err.message,
            variant: "destructive",
        });
    } finally {
        setIsGeneratingPacket(false);
    }
  }, [vin, isAdmin, toast]);


  const handlePaymentStatusChange = (type: PaymentType, value: boolean) => {
    if (!isAdmin) return;
    if (value) {
      setPaymentDate(new Date());
      setPaymentRef("");
      setPaymentDialog({ open: true, type });
    } else {
      setUnpaidConfirmDialog({ open: true, type });
    }
  };

  const handleConfirmPaid = async () => {
    if (!vin || !paymentDialog.type || !paymentDate) return;
    setIsUpdatingPayment(true);
    const jacketDocRef = doc(db, "jackets", vin);
    const type = paymentDialog.type;
    
    let updateData: any = {
      updatedAt: serverTimestamp(),
    };
    
    if (type === 'auction') {
      updateData.isAuctionPaid = true;
      updateData.auctionPaidAt = Timestamp.fromDate(paymentDate);
      updateData.auctionPaymentRef = paymentRef.trim();
    } else if (type === 'mgmt') {
      updateData.isMgmtFeePaid = true;
      updateData.mgmtPaidAt = Timestamp.fromDate(paymentDate);
      updateData.mgmtPaymentRef = paymentRef.trim();
      updateData.isMgmtPaid = deleteField(); // Clean up legacy field
    }

    try {
      await updateDoc(jacketDocRef, updateData);
      console.log(`${type} Paid saved`);
      toast({ title: "Status Updated", description: `Marked as paid successfully.` });
      
      const logMessage = `${type === 'auction' ? 'Auction' : 'Mgmt fee'} marked PAID (${paymentDate.toLocaleDateString()}${paymentRef ? " — " + paymentRef : ""})`;
      await logActivity(vin, {
          type: type === 'auction' ? 'auctionPaidOn' : 'mgmtPaidOn',
          message: logMessage,
          meta: { date: paymentDate, note: paymentRef }
      });
      
      setPaymentDialog({ open: false, type: null });
    } catch (err: any) {
      console.error("Failed to update jacket:", err);
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleConfirmUnpaid = async () => {
    if (!vin || !unpaidConfirmDialog.type) return;
    setIsUpdatingPayment(true);
    const jacketDocRef = doc(db, "jackets", vin);
    const type = unpaidConfirmDialog.type;

    let updateData: any = {
      updatedAt: serverTimestamp(),
    };
    
    if (type === 'auction') {
      updateData.isAuctionPaid = false;
      updateData.auctionPaidAt = deleteField();
      updateData.auctionPaymentRef = deleteField();
    } else if (type === 'mgmt') {
        updateData.isMgmtFeePaid = false;
        updateData.mgmtPaidAt = deleteField();
        updateData.mgmtPaymentRef = deleteField();
        updateData.isMgmtPaid = deleteField(); // Clean up legacy field
    }

    try {
      await updateDoc(jacketDocRef, updateData);
      console.log(`${type} Paid cleared`);
      toast({ title: "Status Updated", description: `Marked as unpaid.` });
      
      await logActivity(vin, {
          type: type === 'auction' ? 'auctionPaidOff' : 'mgmtPaidOff',
          message: `${type === 'auction' ? 'Auction' : 'Mgmt fee'} marked UNPAID`
      });

      setUnpaidConfirmDialog({ open: false, type: null });
    } catch (err: any) {
      console.error("Failed to update jacket:", err);
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  
  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !vin) return;

    const parsedAmount = parseFloat(feeAmount);
    if (feeDescription.trim() === "") {
        setFeeError("Description is required.");
        return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setFeeError("Please enter a valid positive amount.");
        return;
    }
    setFeeError("");
    setIsAddingFee(true);

    const newFee: MiscFee = {
        description: feeDescription.trim(),
        amount: parsedAmount,
        createdAt: Timestamp.fromDate(new Date()),
    };

    try {
        const jacketDocRef = doc(db, "jackets", vin);
        await updateDoc(jacketDocRef, {
            miscFees: arrayUnion(newFee),
            updatedAt: Timestamp.fromDate(new Date()),
        });
        toast({ title: "Fee Added", description: "The miscellaneous fee has been added." });
        
        await logActivity(vin, {
            type: "miscFeeAdded",
            message: `Misc fee added: ${feeDescription.trim()} — ${fmtCurrency(parsedAmount)}`,
            meta: { description: feeDescription.trim(), amount: parsedAmount }
        });

        setFeeDescription("");
        setFeeAmount("");
    } catch (err: any) {
        console.error("Failed to add fee:", err);
        toast({
            title: "Error Adding Fee",
            description: err.message || "An unexpected error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsAddingFee(false);
    }
  };

  const uploadFile = (file: File, type: JacketDocument['type'], onProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storagePath = `jacket-documents/${vin}/${type}/${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (error) => {
          console.error("Upload failed:", error);
          toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            toast({ title: "Upload Failed", description: "Could not get download URL.", variant: "destructive" });
            reject(error);
          }
        }
      );
    });
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAdmin || !docFile || !docType || !vin) {
          setDocError("Please select a file and document type.");
          return;
      }
      setDocError('');
      setIsUploading(true);
      setUploadProgress(0);

      try {
          const downloadURL = await uploadFile(docFile, docType, setUploadProgress);
          const newDocument: JacketDocument = {
              id: `doc-${Date.now()}`,
              name: docFile.name,
              type: docType,
              url: downloadURL,
              createdAt: Timestamp.fromDate(new Date()),
          };

          const jacketDocRef = doc(db, "jackets", vin);
          await updateDoc(jacketDocRef, {
              documents: arrayUnion(newDocument),
              updatedAt: serverTimestamp(),
          });

          toast({ title: "Document Uploaded", description: `${docFile.name} has been added.` });
          
          await logActivity(vin, {
              type: "docAdded",
              message: `${docType.toUpperCase()} uploaded: ${docFile.name}`,
              meta: { type: docType, name: docFile.name }
          });
          
          setDocFile(null);
          setDocType('');
          const fileInput = document.getElementById('docFile') as HTMLInputElement;
          if(fileInput) fileInput.value = "";
      } catch (err: any) {
          // Errors are already toasted in uploadFile
      } finally {
          setIsUploading(false);
          setUploadProgress(0);
      }
  };

  const handleReplaceDocument = async (docId: string, newFile: File) => {
    if (!isAdmin || !vin || !jacket?.documents) return;
    
    const docToReplace = jacket.documents.find(d => d.id === docId);
    if (!docToReplace) {
        toast({ title: "Error", description: "Document not found to replace.", variant: "destructive" });
        return;
    }
    
    setReplacingDocId(docId);
    setUploadProgress(0);

    try {
        const newUrl = await uploadFile(newFile, docToReplace.type, setUploadProgress);
        
        const updatedDocuments = jacket.documents.map(d => 
            d.id === docId 
            ? { ...d, name: newFile.name, url: newUrl, createdAt: Timestamp.fromDate(new Date()) } 
            : d
        );

        const jacketDocRef = doc(db, "jackets", vin);
        await updateDoc(jacketDocRef, {
            documents: updatedDocuments,
            updatedAt: serverTimestamp()
        });

        try {
          const oldFileRef = ref(storage, docToReplace.url);
          await deleteObject(oldFileRef);
        } catch (err) {
            console.warn("Could not delete old file, may be orphaned:", err);
        }

        toast({ title: "Document Replaced", description: `${newFile.name} is now uploaded.` });
        
        await logActivity(vin, {
            type: "docReplaced",
            message: `${docToReplace.type.toUpperCase()} replaced: ${newFile.name}`,
            meta: { type: docToReplace.type, name: newFile.name }
        });

    } catch (err) {
        // Errors already toasted
    } finally {
        setReplacingDocId(null);
        setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async () => {
    if (!isAdmin || !vin || !docToDelete) return;
    
    setIsDeletingDoc(true);

    try {
        const jacketDocRef = doc(db, "jackets", vin);
        const currentDoc = await getDoc(jacketDocRef);
        const currentData = currentDoc.data() as Jacket;

        const updatedDocuments = (currentData.documents || []).filter(d => d.id !== docToDelete.id);

        await updateDoc(jacketDocRef, {
            documents: updatedDocuments,
            updatedAt: serverTimestamp()
        });

        try {
            const storageRef = ref(storage, docToDelete.url);
            await deleteObject(storageRef);
        } catch (err: any) {
           if (err.code === 'storage/object-not-found') {
             console.warn("File to delete was not found in storage, but metadata was removed.");
           } else {
             throw err;
           }
        }


        toast({ title: "Document Deleted", description: `${docToDelete.name} has been removed.` });
        
        await logActivity(vin, {
            type: "docDeleted",
            message: `${(docToDelete.type || "DOC").toUpperCase()} deleted: ${docToDelete.name || "file"}`,
            meta: { type: docToDelete.type, name: docToDelete.name }
        });

    } catch(err: any) {
        if (err.code === 'storage/object-not-found') {
            toast({ title: "Document Deleted", description: "Metadata removed. File was not found in storage." });
        } else {
            console.error("Error deleting document:", err);
            toast({ title: "Deletion Failed", description: err.message, variant: "destructive" });
        }
    } finally {
        setIsDeletingDoc(false);
        setDocToDelete(null);
    }
  };
  
  const handleSaveDealer = async () => {
      if (!vin || !selectedDealer || !isAdmin) {
          toast({ title: "Error", description: "No dealer selected.", variant: "destructive" });
          return;
      }
      setIsSavingDealer(true);
      try {
          const dealer = approvedDealers.find(d => d.uid === selectedDealer);
          const jacketDocRef = doc(db, "jackets", vin);
          await updateDoc(jacketDocRef, {
              dealerId: selectedDealer,
              updatedAt: serverTimestamp(),
          });
          toast({ title: "Success", description: "Dealer assigned successfully." });
          
          await logActivity(vin, {
              type: "assignDealer",
              message: `Assigned to dealer ${dealer?.companyName || selectedDealer}`,
              meta: { dealerUid: selectedDealer, dealerEmail: dealer?.email, dealerName: dealer?.companyName }
          });
          
          setIsEditingDealer(false);
      } catch (err: any) {
          console.error("Failed to assign dealer:", err);
          toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
          setIsSavingDealer(false);
      }
  };


  const fmtCurrency = (n?: number): string => {
    if (n === null || typeof n === "undefined") {
      return "$0.00";
    }
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const isMgmtFeeActuallyPaid = useMemo(() => {
    if (!jacket) return false;
    return jacket.isMgmtFeePaid ?? jacket.isMgmtPaid ?? false;
  }, [jacket]);

  const financials = useMemo(() => {
    if (!jacket) return null;
    const auctionDue =
      (jacket.itemPrice || 0) +
      (jacket.buyerFee || 0) +
      (jacket.onlineFee || 0);
    const mgmtDue = jacket.managementFee || 0;
    const miscTotal =
      jacket.miscFees?.reduce((acc, fee) => acc + (fee?.amount || 0), 0) || 0;
    const subtotal = auctionDue + mgmtDue + miscTotal;
    
    const amountPaid = (jacket.isAuctionPaid ? auctionDue : 0) + (isMgmtFeeActuallyPaid ? mgmtDue : 0);

    const outstanding = subtotal - amountPaid;

    return { auctionDue, mgmtDue, miscTotal, subtotal, outstanding, amountPaid };
  }, [jacket, isMgmtFeeActuallyPaid]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <JacketDetailSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!jacket) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Jacket Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No vehicle jacket was found with the VIN:{" "}
              <span className="font-mono bg-muted px-2 py-1 rounded">
                {vin}
              </span>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const effectiveInvoiceUrl = invoiceUrlLocal ?? jacket?.invoiceUrl ?? "";
  const effectiveInvoiceId = invoiceIdLocal ?? jacket?.invoiceId;
  const effectiveBosUrl = bosUrlLocal ?? jacket?.bosUrl ?? "";
  const effectivePacketUrl = packetUrlLocal ?? jacket?.packetUrl ?? "";


  const PaymentSwitch = ({
    id,
    label,
    checked,
    paidAt,
    paymentRef,
  }: {
    id: PaymentType;
    label: string;
    checked: boolean;
    paidAt?: Timestamp;
    paymentRef?: string;
  }) => (
    <div className="flex-1">
        <div className="flex items-center justify-between">
            <Label htmlFor={`is${id.charAt(0).toUpperCase() + id.slice(1)}Paid`} className="text-base font-medium">
            {label}
            </Label>
            <div className="flex items-center space-x-2">
                <Badge variant={checked ? 'default' : 'destructive'} className="mr-2">{checked ? 'Paid' : 'Unpaid'}</Badge>
                <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger disabled={!isAdmin} asChild>
                         <Switch
                            id={`is${id.charAt(0).toUpperCase() + id.slice(1)}Paid`}
                            checked={checked}
                            onCheckedChange={(val) => handlePaymentStatusChange(id, val)}
                            disabled={!isAdmin || isUpdatingPayment}
                            aria-readonly={!isAdmin}
                        />
                    </TooltipTrigger>
                    {!isAdmin && (
                    <TooltipContent>
                        <p>Admin only</p>
                    </TooltipContent>
                    )}
                </Tooltip>
                </TooltipProvider>
            </div>
        </div>
        {checked && paidAt && (
            <div className="text-xs text-muted-foreground mt-2">
                Paid on {paidAt.toDate().toLocaleDateString()}
                {paymentRef && <p className="font-mono text-xs mt-1 p-1 bg-muted rounded w-fit">Ref: {paymentRef}</p>}
            </div>
        )}
    </div>
  );
  
  const FinancialsGridItem = ({label, value}: {label: string, value: string | number}) => (
    <div className="rounded-md border p-3">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-lg font-semibold">{typeof value === 'number' ? fmtCurrency(value) : value}</dd>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-start bg-background gap-4">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 w-full bg-background/80 p-4 border-b backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">
                        {jacket.year || ""} {jacket.make || "Unknown"}{" "}
                        {jacket.model || "Vehicle"}
                    </h1>
                    <p className="text-sm text-muted-foreground font-mono">{jacket.vin}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                        <span>Color: <strong>{jacket.color || "N/A"}</strong></span>
                        <span>Odometer: <strong>{jacket.odometer ? jacket.odometer.toLocaleString() : "N/A"}</strong></span>
                        <span>Auction Date: <strong>{jacket.auctionSaleDate ? jacket.auctionSaleDate.toDate().toLocaleDateString() : "N/A"}</strong></span>
                        <span>Created: <strong>{jacket.createdAt ? jacket.createdAt.toDate().toLocaleDateString() : "N/A"}</strong></span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {jacket.jacketId && <Badge variant="secondary">Jacket ID: {jacket.jacketId}</Badge>}
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleGenerateInvoice} disabled={isGeneratingInvoice}>
                                {isGeneratingInvoice ? <Loader2 className="animate-spin"/> : <FileText/>} Invoice
                            </Button>
                            <Button size="sm" onClick={handleGenerateBos} disabled={isGeneratingBos}>
                                {isGeneratingBos ? <Loader2 className="animate-spin"/> : <FileText/>} BOS
                            </Button>
                            <Button size="sm" onClick={handleGeneratePacket} disabled={isGeneratingPacket}>
                                {isGeneratingPacket ? <Loader2 className="animate-spin"/> : <FileText/>} Packet
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>

      <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">
                    Documents <Badge variant="secondary" className="ml-2">{jacket.documents?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Payment Status</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <PaymentSwitch
                                    id="auction"
                                    label="Auction Paid"
                                    checked={jacket.isAuctionPaid ?? false}
                                    paidAt={jacket.auctionPaidAt}
                                    paymentRef={jacket.auctionPaymentRef}
                                />
                                <PaymentSwitch
                                    id="mgmt"
                                    label="Management Fee Paid"
                                    checked={isMgmtFeeActuallyPaid}
                                    paidAt={jacket.mgmtPaidAt}
                                    paymentRef={jacket.mgmtPaymentRef}
                                />
                            </CardContent>
                        </Card>

                        {isAdmin && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Assign Dealer</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {isEditingDealer ? (
                                <div className="flex items-center gap-2">
                                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={comboboxOpen}
                                        className="w-[300px] justify-between"
                                      >
                                        {selectedDealer
                                          ? approvedDealers.find((d) => d.uid === selectedDealer)?.companyName
                                          : "Select dealer..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                      <Command>
                                        <CommandInput placeholder="Search dealer..." />
                                        <CommandEmpty>No dealer found.</CommandEmpty>
                                        <CommandGroup>
                                          {approvedDealers.map((dealer) => (
                                            <CommandItem
                                              key={dealer.uid}
                                              value={dealer.companyName}
                                              onSelect={() => {
                                                setSelectedDealer(dealer.uid);
                                                setComboboxOpen(false);
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  selectedDealer === dealer.uid ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <div>
                                                <div>{dealer.companyName}</div>
                                                <div className="text-xs text-muted-foreground">{dealer.email}</div>
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  <Button onClick={handleSaveDealer} disabled={isSavingDealer || !selectedDealer}>
                                    {isSavingDealer ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Save
                                  </Button>
                                   <Button variant="ghost" onClick={() => {setIsEditingDealer(false); setSelectedDealer(jacket.dealerId || '')}}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : assignedDealer ? (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{assignedDealer.companyName}</p>
                                    <p className="text-sm text-muted-foreground">{assignedDealer.email}</p>
                                  </div>
                                  <Button variant="outline" onClick={() => {setIsEditingDealer(true); setSelectedDealer(assignedDealer.uid)}}>
                                    Change
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No dealer assigned.
                                   <Button variant="link" className="pl-1" onClick={() => setIsEditingDealer(true)}>Assign one</Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                    </div>
                    <div className="md:col-span-5 space-y-6">
                       {financials && (
                           <Card>
                             <CardHeader>
                               <CardTitle>Financials</CardTitle>
                             </CardHeader>
                             <CardContent className="grid grid-cols-2 gap-3 text-sm">
                                <FinancialsGridItem label="Item Price" value={jacket.itemPrice || 0} />
                                <FinancialsGridItem label="Buyer Fee" value={jacket.buyerFee || 0} />
                                <FinancialsGridItem label="Online Fee" value={jacket.onlineFee || 0} />
                                <FinancialsGridItem label="Mgmt Fee" value={jacket.managementFee || 0} />
                                <FinancialsGridItem label="Misc Fees" value={financials.miscTotal} />
                                <FinancialsGridItem label="Subtotal" value={financials.subtotal} />
                                <FinancialsGridItem label="Paid" value={financials.amountPaid} />
                                <FinancialsGridItem label="Balance Due" value={financials.outstanding} />
                             </CardContent>
                           </Card>
                       )}
                        <Card>
                            <CardHeader>
                                <CardTitle>Jacket Invoice</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <span className="text-sm text-muted-foreground">Jacket #: </span>
                                    <span className="font-semibold">{jacket?.jacketId || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Invoice ID: </span>
                                    <span className="font-semibold">{effectiveInvoiceId || "Not issued yet"}</span>
                                </div>
                                {effectiveInvoiceUrl ? (
                                    <Button asChild>
                                        <a href={effectiveInvoiceUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> Open Invoice PDF
                                        </a>
                                    </Button>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No invoice has been generated yet.</p>
                                )}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Bill of Sale</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                  <span className="text-sm text-muted-foreground">Jacket #: </span>
                                  <span className="font-semibold">{jacket?.jacketId || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">BOS: </span>
                                  <span className="font-semibold">{effectiveBosUrl ? "Ready" : "Not generated"}</span>
                                </div>
                                {effectiveBosUrl ? (
                                  <Button asChild>
                                      <a href={effectiveBosUrl} target="_blank" rel="noopener noreferrer">
                                          <Download className="mr-2 h-4 w-4" /> Open BOS PDF
                                      </a>
                                  </Button>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No Bill of Sale has been generated yet.</p>
                                )}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Jacket Packet (Invoice + BOS)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                  <span className="text-sm text-muted-foreground">Jacket #: </span>
                                  <span className="font-semibold">{jacket?.jacketId || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Packet: </span>
                                  <span className="font-semibold">{effectivePacketUrl ? "Ready" : "Not generated"}</span>
                                </div>
                                {effectivePacketUrl ? (
                                  <div className="flex items-center gap-2">
                                    <Button asChild>
                                        <a href={effectivePacketUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> Open Packet PDF
                                        </a>
                                    </Button>
                                    <Button variant="secondary" onClick={() => window.open(effectivePacketUrl, '_blank')}>
                                      <Printer className="mr-2 h-4 w-4" />
                                      Print
                                    </Button>
                                  </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No packet has been generated yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="documents">
                <Card>
                    <CardHeader>
                        <CardTitle>Documents</CardTitle>
                         <CardDescription>Manage titles, POAs, and other documents for this jacket.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(!jacket.documents || jacket.documents.length === 0) ? (
                                <p className="text-sm text-muted-foreground p-4 text-center">No documents yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>File Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Added</TableHead>
                                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {jacket.documents.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="font-medium">
                                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline text-primary">
                                                    {doc.name}
                                                  </a>
                                                  {replacingDocId === doc.id && (
                                                      <div className="flex items-center gap-2 pt-2">
                                                          <Progress value={uploadProgress} className="w-full h-2" />
                                                          <span className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</span>
                                                      </div>
                                                  )}
                                                </TableCell>
                                                <TableCell><Badge variant="outline" className="capitalize">{doc.type}</Badge></TableCell>
                                                <TableCell>{doc.createdAt ? doc.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                                                {isAdmin && (
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                          <Button asChild variant="outline" size="icon">
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                                                          </Button>
                                                          <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => document.getElementById(`replace-input-${doc.id}`)?.click()}
                                                            disabled={!!replacingDocId}
                                                          >
                                                            <Replace className="h-4 w-4"/>
                                                            <input
                                                              type="file"
                                                              id={`replace-input-${doc.id}`}
                                                              className="hidden"
                                                              onChange={(e) => {
                                                                  if (e.target.files?.[0]) {
                                                                      handleReplaceDocument(doc.id, e.target.files[0]);
                                                                  }
                                                              }}
                                                            />
                                                          </Button>
                                                          <Button variant="destructive" size="icon" onClick={() => setDocToDelete(doc)} disabled={isDeletingDoc}>
                                                              <Trash2 className="h-4 w-4" />
                                                          </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                    {isAdmin && (
                        <CardFooter className="border-t pt-6">
                            <form onSubmit={handleUploadDocument} className="w-full space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="space-y-1">
                                        <Label htmlFor="docType">Document Type</Label>
                                        <Select value={docType} onValueChange={(v) => setDocType(v as JacketDocument['type'])} disabled={isUploading}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="title">Title</SelectItem>
                                                <SelectItem value="poa">POA</SelectItem>
                                                <SelectItem value="addendum">Addendum</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="docFile">File</Label>
                                        <Input 
                                            id="docFile"
                                            type="file"
                                            onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)}
                                            disabled={isUploading}
                                        />
                                    </div>
                                     <Button type="submit" disabled={isUploading || !docFile || !docType}>
                                        {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4"/>Upload</>}
                                    </Button>
                                </div>
                                {isUploading && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <Progress value={uploadProgress} className="w-full h-2" />
                                        <span className="text-xs text-muted-foreground">
                                        {Math.round(uploadProgress)}%
                                        </span>
                                    </div>
                                )}
                                {docError && <p className="text-sm text-destructive">{docError}</p>}
                            </form>
                        </CardFooter>
                    )}
                </Card>

                 <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Misc Fees</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(!jacket.miscFees || jacket.miscFees.length === 0) ? (
                                <p className="text-sm text-muted-foreground p-4 text-center">No misc fees yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Added</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {jacket.miscFees.map((fee, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{fee.description}</TableCell>
                                                <TableCell>{fee.createdAt ? fee.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                                                <TableCell className="text-right">{fmtCurrency(fee.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                    {isAdmin && (
                        <CardFooter className="border-t pt-6">
                            <form onSubmit={handleAddFee} className="w-full space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="md:col-span-2 space-y-1">
                                        <Label htmlFor="feeDescription">Fee Description</Label>
                                        <Input 
                                            id="feeDescription"
                                            value={feeDescription}
                                            onChange={(e) => setFeeDescription(e.target.value)}
                                            placeholder="e.g. Lost Key Replacement"
                                            disabled={isAddingFee}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="feeAmount">Amount ($)</Label>
                                        <Input
                                            id="feeAmount"
                                            type="number"
                                            value={feeAmount}
                                            onChange={(e) => setFeeAmount(e.target.value)}
                                            placeholder="50.00"
                                            step="0.01"
                                            disabled={isAddingFee}
                                        />
                                    </div>
                                </div>
                                {feeError && <p className="text-sm text-destructive">{feeError}</p>}
                                <Button type="submit" disabled={isAddingFee}>
                                    {isAddingFee ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Adding...</> : 'Add Fee'}
                                </Button>
                            </form>
                        </CardFooter>
                    )}
                </Card>
            </TabsContent>
            
            <TabsContent value="activity">
                 {isAdmin && (
                  <Card>
                    <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
                    <CardContent>
                      {loadingActivity ? (
                          <div className="space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                          </div>
                      ) : activityLog.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">No activity recorded yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {activityLog.map(activity => (
                            <div key={activity.id} className="text-sm border-b pb-2">
                              <p className="font-medium">{activity.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.ts.toDate().toLocaleString()} by {activity.actorName || activity.actorEmail || activity.actorUid}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
            </TabsContent>
          </Tabs>
      </div>

      {/* Dialog for marking as Paid */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment for {paymentDialog.type === 'auction' ? 'Auction' : 'Management Fee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !paymentDate && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={setPaymentDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reference / Note (Optional)</Label>
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="e.g. Check #12345"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, type: null })}>Cancel</Button>
            <Button onClick={handleConfirmPaid} disabled={isUpdatingPayment || !paymentDate}>
              {isUpdatingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={unpaidConfirmDialog.open} onOpenChange={(open) => setUnpaidConfirmDialog({ ...unpaidConfirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the {unpaidConfirmDialog.type} fee as unpaid and clear its payment date and reference. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnpaidConfirmDialog({ open: false, type: null })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnpaid} disabled={isUpdatingPayment} className="bg-destructive hover:bg-destructive/90">
              {isUpdatingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Mark as Unpaid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file <span className="font-medium">"{docToDelete?.name}"</span> from storage and remove its record from this jacket. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocToDelete(null)} disabled={isDeletingDoc}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} disabled={isDeletingDoc} className="bg-destructive hover:bg-destructive/90">
              {isDeletingDoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </main>
  );
}
