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
import { useSafeSnapshot } from "@/hooks/useSafeSnapshot";
import { db, storage, auth, httpsCallableClient } from "@/lib/firebase/client";

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
import {
  Loader2,
  UploadCloud,
  Download,
  FileText,
  Check,
  ChevronsUpDown,
  Calendar as CalendarIcon,
  Trash2,
  Replace,
  ScrollText,
  Files,
  CreditCard,
  UserPlus,
  Save, // NEW
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";

/** ----- Types ----- */
type DocType =
  | "Title"
  | "Power of Attorney"
  | "Release Form"
  | "POA"
  | "Addendum"
  | "Misc Doc";

interface MiscFee {
  id: string;
  description: string;
  amount: number;
  paid?: boolean;
  paidAt?: Timestamp | null;
  note?: string;
  createdAt?: Timestamp;
}

interface JacketDocument {
  id: string;
  name: string;
  type: DocType;
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
  jacketNumber?: string;

  /** preferred timestamp */
  auctionSaleDate?: Timestamp;
  /** legacy string date */
  invoiceDate?: string;

  /** NEW: title number used on reassignment */
  titleNumber?: string;

  isAuctionPaid?: boolean;
  isMgmtFeePaid?: boolean;
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
  /** existing: reassignment download */
  reassignmentUrl?: string;

  creatorId?: string;
  dealerId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  auctionPaidAt?: Timestamp;
  auctionPaymentRef?: string;
  mgmtPaidAt?: Timestamp;
  mgmtPaymentRef?: string;
}

const num = (x: any) => Number(x ?? 0);

interface ApprovedDealer {
  uid: string;
  companyName: string;
  contactName: string;
  email: string;
}

type PaymentType = "auction" | "mgmt";

interface Activity {
  id: string;
  ts: Timestamp;
  actorUid: string;
  actorEmail?: string;
  actorName?: string;
  type:
    | "assignDealer"
    | "auctionPaidOn"
    | "auctionPaidOff"
    | "mgmtPaidOn"
    | "mgmtPaidOff"
    | "miscFeeAdded"
    | "miscFeePaidOn"
    | "miscFeePaidOff"
    | "miscFeeDeleted"
    | "docAdded"
    | "docReplaced"
    | "docDeleted"
    | "invoiceGenerated"
    | "bosGenerated"
    | "packetGenerated"
    | "reassignmentGenerated"
    | "titleInfoUpdated"; // NEW
  message: string;
  meta?: any;
}

/** ----- Utils ----- */
async function logActivity(
  vin: string,
  entry: Omit<Activity, "id" | "ts" | "actorUid" | "actorEmail" | "actorName"> & {
    ts?: any;
  }
) {
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

/** ----- Skeleton ----- */
function JacketDetailSkeleton() {
  return (
    <main className="w-full max-w-screen-xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1">
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-16 w-96" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-4 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="lg:col-span-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </main>
  );
}

/** ----- Assign Dealer (kept logic, tuned styles) ----- */
function AssignDealerComponent({
  jacket,
  approvedDealers,
  isAdmin,
}: {
  jacket: Jacket;
  approvedDealers: ApprovedDealer[];
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(!jacket.dealerId);
  const [selectedDealer, setSelectedDealer] = useState(jacket.dealerId || "");
  const [isSaving, setIsSaving] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const assignedDealer = useMemo(() => {
    if (!jacket.dealerId || approvedDealers.length === 0) return null;
    return approvedDealers.find((d) => d.uid === jacket.dealerId) || null;
  }, [jacket.dealerId, approvedDealers]);

  useEffect(() => {
    setIsEditing(!jacket.dealerId);
    setSelectedDealer(jacket.dealerId || "");
  }, [jacket.dealerId]);

  const handleSave = async () => {
    if (!jacket.vin || !selectedDealer || !isAdmin) {
      toast({
        title: "Error",
        description: "No dealer selected.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const dealer = approvedDealers.find((d) => d.uid === selectedDealer);
      const jacketDocRef = doc(db, "jackets", jacket.vin);
      await updateDoc(jacketDocRef, {
        dealerId: selectedDealer,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Success", description: "Dealer assigned successfully." });
      await logActivity(jacket.vin, {
        type: "assignDealer",
        message: `Assigned to dealer ${dealer?.companyName || selectedDealer}`,
        meta: {
          dealerUid: selectedDealer,
          dealerEmail: dealer?.email,
          dealerName: dealer?.companyName,
        },
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to assign dealer:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return assignedDealer ? (
      <div className="text-sm">
        <p className="text-muted-foreground">Assigned Dealer</p>
        <p className="font-semibold">{assignedDealer.companyName}</p>
      </div>
    ) : null;
  }

  if (!isEditing && assignedDealer) {
    return (
      <div className="flex items-center gap-4 text-sm p-3 rounded-lg bg-muted/50 border">
        <div>
          <p className="text-muted-foreground">Assigned Dealer</p>
          <p className="font-semibold">{assignedDealer.companyName}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
      <UserPlus className="h-5 w-5 text-muted-foreground" />
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={comboboxOpen}
            className="w-64 justify-between bg-card"
          >
            {selectedDealer
              ? approvedDealers.find((d) => d.uid === selectedDealer)?.companyName
              : "Select dealer..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 panel">
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
                  {dealer.companyName}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <Button onClick={handleSave} disabled={isSaving || !selectedDealer} className="btn-primary">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
      </Button>
      {assignedDealer && (
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      )}
    </div>
  );
}

/** ----- Page ----- */
export default function JacketDetailPage() {
  const params = useParams<{ vin: string | string[] }>();
  const vin = useMemo(
    () => (Array.isArray(params?.vin) ? params.vin[0] : params?.vin),
    [params?.vin]
  );

  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [jacket, setJacket] = useState<Jacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isGeneratingBos, setIsGeneratingBos] = useState(false);
  const [isGeneratingPacket, setIsGeneratingPacket] = useState(false);
  const [isGeneratingReassignment, setIsGeneratingReassignment] = useState(false); // NEW

  // NEW: Title Number state
  const [titleNumber, setTitleNumber] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Misc Fee states
  const [feeDescription, setFeeDescription] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeError, setFeeError] = useState("");
  const [isAddingFee, setIsAddingFee] = useState(false);
  const [feeToModify, setFeeToModify] = useState<{
    fee: MiscFee;
    action: "delete" | "pay" | "unpay";
  } | null>(null);
  const [isModifyingFee, setIsModifyingFee] = useState(false);

  // Document states
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [docError, setDocError] = useState("");
  const [docToDelete, setDocToDelete] = useState<JacketDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  // Dealers
  const [approvedDealers, setApprovedDealers] = useState<ApprovedDealer[]>([]);

  // Payment modal state
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    type: PaymentType | null;
  }>({ open: false, type: null });
  const [unpaidConfirmDialog, setUnpaidConfirmDialog] = useState<{
    open: boolean;
    type: PaymentType | null;
  }>({ open: false, type: null });
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentRef, setPaymentRef] = useState("");
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Activity Log
  const [activityLog, setActivityLog] = useState<Activity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  /** --- Live data subscriptions --- */
  useSafeSnapshot(() => {
    if (!vin || !isAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }
    const jacketDocRef = doc(db, "jackets", vin as string);
    return onSnapshot(
      jacketDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const jacketData = { vin: docSnap.id, ...docSnap.data() } as Jacket;
          setJacket(jacketData);
          setError(null);
        } else {
          setError("Jacket not found.");
          setJacket(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === "permission-denied"
            ? "You don't have permission to view this jacket."
            : "Failed to fetch jacket data."
        );
        setLoading(false);
      }
    );
  }, [vin, isAdmin, authLoading]);

  useSafeSnapshot(() => {
    if (!vin || !isAdmin) {
      if (!authLoading) setLoadingActivity(false);
      return;
    }
    const activityQuery = query(
      collection(db, "jackets", vin as string, "activity"),
      orderBy("ts", "desc")
    );
    return onSnapshot(
      activityQuery,
      (snapshot) => {
        const activities = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Activity)
        );
        setActivityLog(activities);
        setLoadingActivity(false);
      },
      (err) => {
        console.error("Error fetching activity log:", err);
        setLoadingActivity(false);
      }
    );
  }, [vin, isAdmin, authLoading]);

  useEffect(() => {
    async function fetchDealers() {
      if (!isAdmin) return;
      try {
        const q = query(collection(db, "users"), where("status", "==", "approved"));
        const qs = await getDocs(q);
        const dealers = qs.docs.map(
          (d) =>
            ({
              uid: d.id,
              companyName: d.data().companyName || "N/A",
              contactName: d.data().contactName || "N/A",
              email: d.data().email || "N/A",
            } as ApprovedDealer)
        );
        setApprovedDealers(dealers);
      } catch (error) {
        console.error("Failed to fetch dealers:", error);
        toast({
          title: "Error",
          description: "Could not load approved dealers.",
          variant: "destructive",
        });
      }
    }
    fetchDealers();
  }, [isAdmin, toast]);

  /** NEW: populate Title Number from jacket on load */
  useEffect(() => {
    if (jacket?.titleNumber) {
      setTitleNumber(jacket.titleNumber);
    }
  }, [jacket]);

  /** --- Document Generation (httpsCallableClient wrapper) --- */
  const handleGenerateInvoice = useCallback(async () => {
    if (!vin || !isAdmin) return;
    setIsGeneratingInvoice(true);
    try {
      const generateJacketInvoice = httpsCallableClient("generateJacketInvoice");
      const result = await generateJacketInvoice({ vin });
      const { url, invoiceId } = result.data as { url?: string; invoiceId?: string };

      if (url) {
        toast({
          title: "Invoice Ready!",
          description: (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              Click here to open the invoice.
            </a>
          ),
        });
        await logActivity(vin as string, {
          type: "invoiceGenerated",
          message: `Invoice generated${invoiceId ? " — " + invoiceId : ""}`,
          meta: { invoiceId },
        });
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
      const generateBillOfSale = httpsCallableClient("generateBillOfSale");
      const result = await generateBillOfSale({ vin });
      const { url } = result.data as { url?: string };

      if (url) {
        toast({
          title: "Bill of Sale Ready!",
          description: (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              Click here to open the BOS.
            </a>
          ),
        });
        await logActivity(vin as string, {
          type: "bosGenerated",
          message: "Bill of Sale generated",
          meta: { url },
        });
      } else {
        toast({
          title: "BOS Generation Started",
          description:
            "The Bill of Sale is being generated and will appear here shortly.",
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

  const handleGenerateReassignment = useCallback(async () => {
    if (!vin || !isAdmin) return;
    setIsGeneratingReassignment(true);
    try {
      const generateReassignmentForm = httpsCallableClient("generateReassignmentForm");
      const result = await generateReassignmentForm({ vin });
      const { url } = (result?.data ?? {}) as { url?: string };

      if (url) {
        toast({
          title: "Reassignment Ready!",
          description: (
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline font-bold">
              Open Reassignment PDF
            </a>
          ),
        });
      } else {
        toast({
          title: "Reassignment Form Started",
          description: "The document is being generated and will appear shortly.",
        });
      }

      await logActivity(vin as string, {
        type: "reassignmentGenerated",
        message: "Dealer Reassignment Form generation triggered",
      });
    } catch (err: any) {
      console.error("Error generating reassignment form:", err);
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingReassignment(false);
    }
  }, [vin, isAdmin, toast]);

  const handleGeneratePacket = useCallback(async () => {
    if (!vin || !isAdmin) return;
    setIsGeneratingPacket(true);
    try {
      const generateJacketPacket = httpsCallableClient("generateJacketPacket");
      const result = await generateJacketPacket({ vin });
      const { url } = result.data as { url?: string };

      if (url) {
        toast({
          title: "Jacket Packet Ready!",
          description: (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              Click here to open the packet.
            </a>
          ),
        });
        await logActivity(vin as string, {
          type: "packetGenerated",
          message: "Jacket Packet generated",
          meta: { url },
        });
      } else {
        toast({
          title: "Packet Generation Started",
          description:
            "The jacket packet is being generated and will appear here shortly.",
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

  /** NEW: Save Title Number */
  const handleSaveTitleNumber = async () => {
    if (!vin || !isAdmin) return;
    setIsSavingTitle(true);
    try {
      const jacketDocRef = doc(db, "jackets", vin as string);
      await updateDoc(jacketDocRef, {
        titleNumber: titleNumber,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Success", description: "Title Number has been saved." });
      await logActivity(vin as string, {
        type: "titleInfoUpdated",
        message: `Title Number set to ${titleNumber}`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingTitle(false);
    }
  };

  /** --- Payments --- */
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
    const jacketDocRef = doc(db, "jackets", vin as string);
    const type = paymentDialog.type;

    let updateData: any = { updatedAt: serverTimestamp() };

    if (type === "auction") {
      updateData.isAuctionPaid = true;
      updateData.auctionPaidAt = Timestamp.fromDate(paymentDate);
      updateData.auctionPaymentRef = paymentRef.trim();
    } else if (type === "mgmt") {
      updateData.isMgmtFeePaid = true;
      updateData.mgmtPaidAt = Timestamp.fromDate(paymentDate);
      updateData.mgmtPaymentRef = paymentRef.trim();
    }

    try {
      await updateDoc(jacketDocRef, updateData);
      toast({ title: "Status Updated", description: `Marked as paid successfully.` });

      const logMessage = `${
        type === "auction" ? "Auction" : "Mgmt fee"
      } marked PAID (${paymentDate.toLocaleDateString()}${
        paymentRef ? " — " + paymentRef : ""
      })`;
      await logActivity(vin as string, {
        type: type === "auction" ? "auctionPaidOn" : "mgmtPaidOn",
        message: logMessage,
        meta: { date: paymentDate, note: paymentRef },
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
    const jacketDocRef = doc(db, "jackets", vin as string);
    const type = unpaidConfirmDialog.type;

    let updateData: any = { updatedAt: serverTimestamp() };

    if (type === "auction") {
      updateData.isAuctionPaid = false;
      updateData.auctionPaidAt = deleteField();
      updateData.auctionPaymentRef = deleteField();
    } else if (type === "mgmt") {
      updateData.isMgmtFeePaid = false;
      updateData.mgmtPaidAt = deleteField();
      updateData.mgmtPaymentRef = deleteField();
    }

    try {
      await updateDoc(jacketDocRef, updateData);
      toast({ title: "Status Updated", description: `Marked as unpaid.` });

      await logActivity(vin as string, {
        type: type === "auction" ? "auctionPaidOff" : "mgmtPaidOff",
        message: `${type === "auction" ? "Auction" : "Mgmt fee"} marked UNPAID`,
      });

      setUnpaidConfirmDialog({ open: false, type: null });
    } catch (err: any) {
      console.error("Failed to update jacket:", err);
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  /** --- Misc Fees --- */
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
      id: `fee-${Date.now()}`,
      description: feeDescription.trim(),
      amount: parsedAmount,
      paid: false,
      createdAt: Timestamp.fromDate(new Date()),
    };

    try {
      const jacketDocRef = doc(db, "jackets", vin as string);
      await updateDoc(jacketDocRef, {
        miscFees: arrayUnion(newFee),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Fee Added", description: "The miscellaneous fee has been added." });

      await logActivity(vin as string, {
        type: "miscFeeAdded",
        message: `Misc fee added: ${feeDescription.trim()} — ${fmtCurrency(parsedAmount)}`,
        meta: { description: feeDescription.trim(), amount: parsedAmount },
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

  const handleModifyFee = async () => {
    if (!isAdmin || !vin || !feeToModify) return;

    const { fee, action } = feeToModify;
    setIsModifyingFee(true);

    try {
      const jacketDocRef = doc(db, "jackets", vin);
      const currentDoc = await getDoc(jacketDocRef);
      const currentFees = (currentDoc.data() as Jacket)?.miscFees || [];

      let updatedFees: MiscFee[] = [];
      let logMessage = "";
      let logType: Activity["type"] = "miscFeeDeleted"; // default

      if (action === "delete") {
        updatedFees = currentFees.filter((f) => f.id !== fee.id);
        logMessage = `Misc fee deleted: ${fee.description} — ${fmtCurrency(fee.amount)}`;
        logType = "miscFeeDeleted";
      } else {
        updatedFees = currentFees.map((f) => {
          if (f.id === fee.id) {
            const isPaid = action === "pay";
            logMessage = `Misc fee "${f.description}" marked ${isPaid ? "PAID" : "UNPAID"}`;
            logType = isPaid ? "miscFeePaidOn" : "miscFeePaidOff";
            return { ...f, paid: isPaid, paidAt: isPaid ? Timestamp.now() : null };
          }
          return f;
        });
      }

      await updateDoc(jacketDocRef, {
        miscFees: updatedFees,
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Fee Updated", description: "The fee status has been changed." });
      await logActivity(vin, { type: logType, message: logMessage, meta: { feeId: fee.id } });
    } catch (err: any) {
      console.error("Failed to modify fee:", err);
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsModifyingFee(false);
      setFeeToModify(null);
    }
  };

  /** --- Documents --- */
  const uploadFile = (
    file: File,
    type: DocType,
    onProgress: (p: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storagePath = `jacket-documents/${vin}/${type}/${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) =>
          onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (error) => {
          console.error("Upload failed:", error);
          toast({
            title: "Upload Failed",
            description: error.message,
            variant: "destructive",
          });
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            toast({
              title: "Upload Failed",
              description: "Could not get download URL.",
              variant: "destructive",
            });
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
    setDocError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const downloadURL = await uploadFile(docFile, docType as DocType, setUploadProgress);
      const newDocument: JacketDocument = {
        id: `doc-${Date.now()}`,
        name: docFile.name,
        type: docType as DocType,
        url: downloadURL,
        createdAt: Timestamp.fromDate(new Date()),
      };

      const jacketDocRef = doc(db, "jackets", vin as string);
      await updateDoc(jacketDocRef, {
        documents: arrayUnion(newDocument),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Document Uploaded",
        description: `${docFile.name} has been added.`,
      });

      await logActivity(vin as string, {
        type: "docAdded",
        message: `${(docType as DocType).toUpperCase()} uploaded: ${docFile.name}`,
        meta: { type: docType, name: docFile.name },
      });

      setDocFile(null);
      setDocType("");
      const fileInput = document.getElementById("docFile") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch {
      // already toasted
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleReplaceDocument = async (docId: string, newFile: File) => {
    if (!isAdmin || !vin || !jacket?.documents) return;

    const docToReplace = jacket.documents.find((d) => d.id === docId);
    if (!docToReplace) {
      toast({
        title: "Error",
        description: "Document not found to replace.",
        variant: "destructive",
      });
      return;
    }

    setReplacingDocId(docId);
    setUploadProgress(0);

    try {
      const newUrl = await uploadFile(newFile, docToReplace.type, setUploadProgress);

      const updatedDocuments = jacket.documents.map((d) =>
        d.id === docId
          ? { ...d, name: newFile.name, url: newUrl, createdAt: Timestamp.fromDate(new Date()) }
          : d
      );

      const jacketDocRef = doc(db, "jackets", vin as string);
      await updateDoc(jacketDocRef, {
        documents: updatedDocuments,
        updatedAt: serverTimestamp(),
      });

      try {
        const oldFileRef = ref(storage, docToReplace.url);
        await deleteObject(oldFileRef);
      } catch (err) {
        console.warn("Could not delete old file, may be orphaned:", err);
      }

      toast({
        title: "Document Replaced",
        description: `${newFile.name} is now uploaded.`,
      });

      await logActivity(vin as string, {
        type: "docReplaced",
        message: `${docToReplace.type.toUpperCase()} replaced: ${newFile.name}`,
        meta: { type: docToReplace.type, name: newFile.name },
      });
    } catch {
      // already toasted
    } finally {
      setReplacingDocId(null);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async () => {
    if (!isAdmin || !vin || !docToDelete) return;

    setIsDeletingDoc(true);

    try {
      const jacketDocRef = doc(db, "jackets", vin as string);
      const currentDoc = await getDoc(jacketDocRef);
      const currentData = currentDoc.data() as Jacket;

    const updatedDocuments = (currentData.documents || []).filter(
        (d) => d.id !== docToDelete.id
      );

      await updateDoc(jacketDocRef, {
        documents: updatedDocuments,
        updatedAt: serverTimestamp(),
      });

      try {
        const storageRef = ref(storage, docToDelete.url);
        await deleteObject(storageRef);
      } catch (err: any) {
        if (err.code === "storage/object-not-found") {
          console.warn(
            "File to delete was not found in storage, but metadata was removed."
          );
        } else {
          throw err;
        }
      }

      toast({
        title: "Document Deleted",
        description: `${docToDelete.name} has been removed.`,
      });

      await logActivity(vin as string, {
        type: "docDeleted",
        message: `${(docToDelete.type || "DOC").toUpperCase()} deleted: ${
          docToDelete.name || "file"
        }`,
        meta: { type: docToDelete.type, name: docToDelete.name },
      });
    } catch (err: any) {
      if (err.code === "storage/object-not-found") {
        toast({
          title: "Document Deleted",
          description: "Metadata removed. File was not found in storage.",
        });
      } else {
        console.error("Error deleting document:", err);
        toast({
          title: "Deletion Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsDeletingDoc(false);
      setDocToDelete(null);
    }
  };

  /** --- Currency --- */
  const fmtCurrency = (n?: number): string => {
    if (n === null || typeof n === "undefined") {
      return "$0.00";
    }
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  /** --- Financials --- */
  const financials = useMemo(() => {
    if (!jacket) return null;

    const auctionDue = num(jacket.itemPrice) + num(jacket.buyerFee) + num(jacket.onlineFee);
    const mgmtDue = num(jacket.managementFee);

    const paidMisc = (jacket.miscFees || [])
      .filter((f) => f.paid)
      .reduce((acc, fee) => acc + num(fee.amount), 0);
    const unpaidMisc = (jacket.miscFees || [])
      .filter((f) => !f.paid)
      .reduce((acc, fee) => acc + num(fee.amount), 0);

    const amountPaid =
      (jacket.isAuctionPaid ? auctionDue : 0) +
      (jacket.isMgmtFeePaid ? mgmtDue : 0) +
      paidMisc;

    const totalCost = auctionDue + mgmtDue + paidMisc + unpaidMisc;
    const balanceDue = Math.max(0, totalCost - amountPaid);

    return {
      auctionDue,
      mgmtDue,
      subtotal: totalCost,
      outstanding: balanceDue,
      amountPaid,
      paidMisc,
      unpaidMisc,
    };
  }, [jacket]);

  /** --- Early exits --- */
  if (loading || authLoading) {
    return <JacketDetailSkeleton />;
  }

  if (error) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <Card className="panel text-center w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
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
      <main className="flex h-[60vh] items-center justify-center">
        <Card className="panel text-center w-full max-w-lg">
          <CardHeader>
            <CardTitle>Jacket Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No jacket found with VIN:{" "}
              <span className="font-mono bg-muted px-2 py-1 rounded">{vin}</span>.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  /** Auction Date fix */
  const formattedAuctionDate =
    jacket.auctionSaleDate?.toDate
      ? format(jacket.auctionSaleDate.toDate(), "PP")
      : jacket.invoiceDate && isValid(new Date(jacket.invoiceDate))
      ? format(new Date(jacket.invoiceDate), "PP")
      : "N/A";

  const FinancialsGridItem = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="flex flex-col gap-1 rounded-lg border p-3 bg-background/50">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tracking-tight">{value}</dd>
    </div>
  );

  /** ----- UI ----- */
  return (
    <main className="w-full max-w-screen-xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              {jacket.year} {jacket.make} {jacket.model}
            </h1>
            {jacket.jacketNumber && (
              <Badge variant="secondary" className="text-base">
                #{jacket.jacketNumber}
              </Badge>
            )}
          </div>
          <div className="flex items-center text-sm text-muted-foreground gap-x-4 gap-y-1 flex-wrap">
            <span className="font-mono">{jacket.vin}</span>
            <span>
              Color:{" "}
              <span className="font-medium text-foreground">{jacket.color || "N/A"}</span>
            </span>
            <span>
              Odometer:{" "}
              <span className="font-medium text-foreground">
                {typeof jacket.odometer === "number"
                  ? `${jacket.odometer.toLocaleString()} miles`
                  : "N/A"}
              </span>
            </span>
            <span>
              Auction Date:{" "}
              <span className="font-medium text-foreground">{formattedAuctionDate}</span>
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice || !isAdmin}
              className="btn-primary"
            >
              <Loader2
                className={cn(
                  "mr-2 h-4 w-4",
                  !isGeneratingInvoice && "hidden",
                  isGeneratingInvoice && "animate-spin"
                )}
              />
              <FileText className={cn("mr-2 h-4 w-4", isGeneratingInvoice && "hidden")} />
              Invoice
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateBos}
              disabled={isGeneratingBos || !isAdmin}
              className="btn-soft"
            >
              <Loader2
                className={cn(
                  "mr-2 h-4 w-4",
                  !isGeneratingBos && "hidden",
                  isGeneratingBos && "animate-spin"
                )}
              />
              <ScrollText className={cn("mr-2 h-4 w-4", isGeneratingBos && "hidden")} />
              Bill of Sale
            </Button>

            {/* NEW: Reassignment button */}
            <Button
              size="sm"
              onClick={handleGenerateReassignment}
              disabled={isGeneratingReassignment || !isAdmin}
              className="btn-soft"
            >
              <Loader2
                className={cn(
                  "mr-2 h-4 w-4",
                  !isGeneratingReassignment && "hidden",
                  isGeneratingReassignment && "animate-spin"
                )}
              />
              <ScrollText className={cn("mr-2 h-4 w-4", isGeneratingReassignment && "hidden")} />
              Reassignment
            </Button>

            <Button
              size="sm"
              onClick={handleGeneratePacket}
              disabled={isGeneratingPacket || !isAdmin}
              className="btn-soft"
            >
              <Loader2
                className={cn(
                  "mr-2 h-4 w-4",
                  !isGeneratingPacket && "hidden",
                  isGeneratingPacket && "animate-spin"
                )}
              />
              <Files className={cn("mr-2 h-4 w-4", isGeneratingPacket && "hidden")} />
              Jacket
            </Button>
          </div>
          {isAdmin && (
            <AssignDealerComponent
              jacket={jacket}
              approvedDealers={approvedDealers}
              isAdmin={!!isAdmin}
            />
          )}
        </div>
      </div>

      {/* NEW: Title Information card (directly under Assigned Dealer) */}
      <Card className="panel">
        <CardHeader>
          <CardTitle>Title Information</CardTitle>
          <CardDescription>
            Enter the title number for this vehicle. This will be used on the Reassignment Form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-grow space-y-1">
              <Label htmlFor="titleNumber">Title Number</Label>
              <Input
                id="titleNumber"
                value={titleNumber}
                onChange={(e) => setTitleNumber(e.target.value)}
                placeholder="Enter title number..."
                className="input-like"
              />
            </div>
            <Button
              onClick={handleSaveTitleNumber}
              disabled={isSavingTitle || !isAdmin}
              className="btn-soft"
            >
              {isSavingTitle ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Title Info
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50 p-1 h-auto rounded-lg">
          <TabsTrigger value="overview" className="nav-link data-[state=active]:nav-link-active">
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="misc-fees"
            className="nav-link data-[state=active]:nav-link-active"
          >
            Misc Fees{" "}
            <Badge variant="secondary" className="ml-2">
              {jacket.miscFees?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="nav-link data-[state=active]:nav-link-active"
          >
            Documents{" "}
            <Badge variant="secondary" className="ml-2">
              {jacket.documents?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="activity" className="nav-link data-[state=active]:nav-link-active">
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              <Card className="panel">
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auction */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auctionPaid" className="font-medium">
                        Auction Paid
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={jacket.isAuctionPaid ? "default" : "destructive"}
                          className="mr-2"
                        >
                          {jacket.isAuctionPaid ? "Paid" : "Unpaid"}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger disabled={!isAdmin} asChild>
                              <Switch
                                id="auctionPaid"
                                checked={!!jacket.isAuctionPaid}
                                onCheckedChange={(val) => handlePaymentStatusChange("auction", val)}
                                disabled={!isAdmin || isUpdatingPayment}
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
                    {jacket.isAuctionPaid && jacket.auctionPaidAt && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Paid on {jacket.auctionPaidAt.toDate().toLocaleDateString()}
                        {jacket.auctionPaymentRef && (
                          <p className="font-mono text-xs mt-1 p-1 bg-muted rounded w-fit">
                            Ref: {jacket.auctionPaymentRef}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Mgmt */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mgmtPaid" className="font-medium">
                        Management Fee Paid
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={jacket.isMgmtFeePaid ? "default" : "destructive"}
                          className="mr-2"
                        >
                          {jacket.isMgmtFeePaid ? "Paid" : "Unpaid"}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger disabled={!isAdmin} asChild>
                              <Switch
                                id="mgmtPaid"
                                checked={!!jacket.isMgmtFeePaid}
                                onCheckedChange={(val) => handlePaymentStatusChange("mgmt", val)}
                                disabled={!isAdmin || isUpdatingPayment}
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
                    {jacket.isMgmtFeePaid && jacket.mgmtPaidAt && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Paid on {jacket.mgmtPaidAt.toDate().toLocaleDateString()}
                        {jacket.mgmtPaymentRef && (
                          <p className="font-mono text-xs mt-1 p-1 bg-muted rounded w-fit">
                            Ref: {jacket.mgmtPaymentRef}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="panel">
                <CardHeader>
                  <CardTitle>Download Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <Label>Jacket Invoice</Label>
                    {jacket.invoiceUrl ? (
                      <Button asChild size="sm" className="btn-soft">
                        <a href={jacket.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Not Generated</Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <Label>Bill of Sale</Label>
                    {jacket.bosUrl ? (
                      <Button asChild size="sm" className="btn-soft">
                        <a href={jacket.bosUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Not Generated</Badge>
                    )}
                  </div>

                  {/* NEW: Reassignment download row */}
                  <div className="flex justify-between items-center text-sm">
                    <Label>Reassignment Form</Label>
                    {jacket.reassignmentUrl ? (
                      <Button asChild size="sm" className="btn-soft">
                        <a
                          href={jacket.reassignmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Not Generated</Badge>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <Label>Full Jacket Packet</Label>
                    {jacket.packetUrl ? (
                      <Button asChild size="sm" className="btn-soft">
                        <a href={jacket.packetUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Not Generated</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8">
              {financials && (
                <Card className="panel">
                  <CardHeader>
                    <CardTitle>Financials</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FinancialsGridItem label="Item Price" value={fmtCurrency(jacket.itemPrice)} />
                    <FinancialsGridItem label="Buyer Fee" value={fmtCurrency(jacket.buyerFee)} />
                    <FinancialsGridItem label="Online Fee" value={fmtCurrency(jacket.onlineFee)} />
                    <FinancialsGridItem
                      label="Management Fee"
                      value={fmtCurrency(jacket.managementFee)}
                    />
                    <FinancialsGridItem
                      label="Paid Misc Fees"
                      value={fmtCurrency(financials.paidMisc)}
                    />
                    <FinancialsGridItem
                      label="Unpaid Misc Fees"
                      value={fmtCurrency(financials.unpaidMisc)}
                    />
                    <div className="col-span-2 md:col-span-3 border-t my-2" />
                    <FinancialsGridItem
                      label="Total Cost"
                      value={fmtCurrency(financials.subtotal)}
                    />
                    <FinancialsGridItem
                      label="Total Paid"
                      value={fmtCurrency(financials.amountPaid)}
                    />
                    <FinancialsGridItem
                      label="Balance Due"
                      value={fmtCurrency(financials.outstanding)}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Misc Fees */}
        <TabsContent value="misc-fees" className="mt-6">
          <Card className="panel">
            <CardHeader>
              <CardTitle>Miscellaneous Fees</CardTitle>
              <CardDescription>
                Manage additional fees associated with this jacket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!jacket.miscFees || jacket.miscFees.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No misc fees yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jacket.miscFees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.description}</TableCell>
                        <TableCell>{fmtCurrency(fee.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={fee.paid ? "default" : "destructive"}>
                            {fee.paid ? "Paid" : "Unpaid"}
                          </Badge>
                          {fee.paid && fee.paidAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {fee.paidAt.toDate().toLocaleDateString()}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {fee.createdAt ? fee.createdAt.toDate().toLocaleDateString() : "N/A"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setFeeToModify({ fee, action: fee.paid ? "unpay" : "pay" })
                                }
                                disabled={isModifyingFee}
                                className="btn-soft"
                              >
                                <CreditCard className="mr-2 h-4 w-4" /> Mark{" "}
                                {fee.paid ? "Unpaid" : "Paid"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => setFeeToModify({ fee, action: "delete" })}
                                disabled={isModifyingFee}
                              >
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
                        className="input-like"
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
                        className="input-like"
                      />
                    </div>
                  </div>
                  {feeError && <p className="text-sm text-destructive">{feeError}</p>}
                  <Button type="submit" disabled={isAddingFee} className="btn-primary">
                    {isAddingFee ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                      </>
                    ) : (
                      "Add Fee"
                    )}
                  </Button>
                </form>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-6">
          <Card className="panel">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Manage titles, POAs, and other documents for this jacket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!jacket.documents || jacket.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No documents yet.
                </p>
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
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:underline text-primary"
                          >
                            {doc.name}
                          </a>
                          {replacingDocId === doc.id && (
                            <div className="flex items-center gap-2 pt-2">
                              <Progress value={uploadProgress} className="w-full h-2" />
                              <span className="text-xs text-muted-foreground">
                                {Math.round(uploadProgress)}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {doc.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {doc.createdAt ? doc.createdAt.toDate().toLocaleDateString() : "N/A"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button asChild variant="outline" size="icon" className="btn-soft">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="btn-soft"
                                onClick={() =>
                                  document.getElementById(`replace-input-${doc.id}`)?.click()
                                }
                                disabled={!!replacingDocId}
                              >
                                <Replace className="h-4 w-4" />
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
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => setDocToDelete(doc)}
                                disabled={isDeletingDoc}
                              >
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
            </CardContent>
            {isAdmin && (
              <CardFooter className="border-t pt-6">
                <form onSubmit={handleUploadDocument} className="w-full space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <Label htmlFor="docType">Document Type</Label>
                      <Select
                        value={docType}
                        onValueChange={(v) => setDocType(v as DocType)}
                        disabled={isUploading}
                      >
                        <SelectTrigger className="input-like">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent className="panel">
                          <SelectItem value="Title">Title</SelectItem>
                          <SelectItem value="Power of Attorney">Power of Attorney</SelectItem>
                          <SelectItem value="Release Form">Release Form</SelectItem>
                          <SelectItem value="POA">POA</SelectItem>
                          <SelectItem value="Addendum">Addendum</SelectItem>
                          <SelectItem value="Misc Doc">Misc Doc</SelectItem>
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
                        className="input-like"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isUploading || !docFile || !docType}
                      className="btn-primary"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                  {isUploading && <Progress value={uploadProgress} className="w-full h-2 mt-2" />}
                  {docError && <p className="text-sm text-destructive mt-2">{docError}</p>}
                </form>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Activity Log */}
        <TabsContent value="activity" className="mt-6">
          <Card className="panel">
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {activityLog.map((activity) => (
                    <div key={activity.id} className="text-sm border-b border-border pb-2">
                      <p className="font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.ts.toDate().toLocaleString()} by{" "}
                        {activity.actorName || activity.actorEmail || activity.actorUid}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- Dialogs & Alerts ---- */}
      <Dialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Payment for {paymentDialog.type === "auction" ? "Auction" : "Management Fee"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-card",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 panel">
                  <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reference / Note (Optional)</Label>
              <Input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. Check #12345"
                className="input-like"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, type: null })}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPaid} disabled={isUpdatingPayment || !paymentDate} className="btn-primary">
              {isUpdatingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={unpaidConfirmDialog.open}
        onOpenChange={(open) => setUnpaidConfirmDialog({ ...unpaidConfirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the {unpaidConfirmDialog.type} fee as unpaid and clear its payment date
              and reference. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnpaidConfirmDialog({ open: false, type: null })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnpaid}
              disabled={isUpdatingPayment}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isUpdatingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Mark as Unpaid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium">"{docToDelete?.name}"</span> from storage and remove its
              record from this jacket. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocToDelete(null)} disabled={isDeletingDoc}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeletingDoc}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingDoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!feeToModify} onOpenChange={(open) => !open && setFeeToModify(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {feeToModify?.action === "delete"
                ? `This will permanently delete the fee "${feeToModify?.fee.description}". This action cannot be undone.`
                : `This will mark the fee "${feeToModify?.fee.description}" as ${
                    feeToModify?.action === "pay" ? "Paid" : "Unpaid"
                  }.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFeeToModify(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleModifyFee}
              disabled={isModifyingFee}
              className={feeToModify?.action === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isModifyingFee && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
