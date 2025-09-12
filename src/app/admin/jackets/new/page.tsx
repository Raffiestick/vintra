
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Timestamp,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { useAuth } from "@/hooks/use-auth";
import { db, storage } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, UploadCloud } from "lucide-react";

function ManualCreateCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vin, setVin] = useState("");
  const [auctionSaleDate, setAuctionSaleDate] = useState<Date | undefined>();
  const [saleLocation, setSaleLocation] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [odometer, setOdometer] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [buyerFee, setBuyerFee] = useState("");
  const [onlineFee, setOnlineFee] = useState("");
  const [managementFee, setManagementFee] = useState("100");

  const [vinError, setVinError] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const { user } = useAuth();


  const validateForm = () => {
    let isValid = true;
    if (vin.trim().length < 6) {
      setVinError("VIN must be at least 6 characters.");
      isValid = false;
    } else {
      setVinError("");
    }
    if (!auctionSaleDate) {
      setDateError("Auction sale date is required.");
      isValid = false;
    } else {
      setDateError("");
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validateForm()) {
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a jacket.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const normalizedVin = vin.trim().toUpperCase();
    const jacketRef = doc(db, "jackets", normalizedVin);

    try {
      const docSnap = await getDoc(jacketRef);
      if (docSnap.exists()) {
        setVinError("VIN already exists in the database.");
        setLoading(false);
        return;
      }

      const payload = {
        jacketId: `J${Date.now()}`,
        vin: normalizedVin,
        auctionSaleDate: Timestamp.fromDate(auctionSaleDate!),
        saleLocation: saleLocation || "",
        year: year ? Number(year) : 0,
        make: make || "",
        model: model || "",
        color: color || "",
        odometer: odometer ? Number(odometer) : 0,
        itemPrice: itemPrice ? Number(itemPrice) : 0,
        buyerFee: buyerFee ? Number(buyerFee) : 0,
        onlineFee: onlineFee ? Number(onlineFee) : 0,
        managementFee: managementFee ? Number(managementFee) : 0,
        isAuctionPaid: false,
        isMgmtFeePaid: false,
        miscFees: [],
        documents: [],
        invoiceUrl: "",
        dealerId: "",
        creatorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(jacketRef, payload, { merge: false });

      toast({
        title: "Success!",
        description: "Jacket created successfully.",
      });
      router.push(`/admin/jackets/${normalizedVin}`);
    } catch (error: any) {
      console.error("Error creating jacket:", error);
      const errorMessage = error.message || "An unexpected error occurred.";
      setSubmitError(errorMessage);
      toast({
        title: "Error Creating Jacket",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Jacket (Manual)</CardTitle>
        <CardDescription>
          Fill out the form below to create a new vehicle jacket.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                required
                minLength={6}
              />
              {vinError && <p className="text-sm text-destructive">{vinError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="auctionSaleDate">Auction Sale Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !auctionSaleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {auctionSaleDate ? (
                      format(auctionSaleDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={auctionSaleDate}
                    onSelect={setAuctionSaleDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {dateError && <p className="text-sm text-destructive">{dateError}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" type="number" placeholder="e.g. 2023" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" placeholder="e.g. Toyota" value={make} onChange={(e) => setMake(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" placeholder="e.g. Camry" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" placeholder="e.g. Super White" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="odometer">Odometer</Label>
                <Input id="odometer" type="number" placeholder="e.g. 25000" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="saleLocation">Sale Location</Label>
                <Input id="saleLocation" placeholder="e.g. Dallas, TX" value={saleLocation} onChange={(e) => setSaleLocation(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="space-y-2">
                <Label htmlFor="itemPrice">Item Price ($)</Label>
                <Input id="itemPrice" type="number" placeholder="12000.00" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="buyerFee">Buyer Fee ($)</Label>
                <Input id="buyerFee" type="number" placeholder="500.00" step="0.01" value={buyerFee} onChange={(e) => setBuyerFee(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="onlineFee">Online Fee ($)</Label>
                <Input id="onlineFee" type="number" placeholder="50.00" step="0.01" value={onlineFee} onChange={(e) => setOnlineFee(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="managementFee">Management Fee ($)</Label>
                <Input id="managementFee" type="number" placeholder="100.00" step="0.01" value={managementFee} onChange={(e) => setManagementFee(e.target.value)} />
            </div>
          </div>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Jacket"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function AiParseCard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !user || !isAdmin) {
      toast({ title: "Error", description: "File and admin authentication are required.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setProgress(0);
    
    const storagePath = `incoming/invoices/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(currentProgress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        setUploading(false);
      },
      async () => {
        // Upload complete, now call the function
        toast({ title: "Upload Complete", description: "Now parsing file..." });
        const gcsPath = uploadTask.snapshot.ref.fullPath;
        try {
          const response = await fetch("https://us-central1-rizeup-dealer-connect-n6k7r.cloudfunctions.net/startInvoiceParse", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gcsPath }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Function returned status ${response.status}`);
          }
          
          const result = await response.json();

          if (result.ok && result.stagingId) {
            toast({ title: "Parse Complete!", description: `Found ${result.unitsCount || 0} units. Redirecting...` });
            router.push(`/admin/staging/invoices/${result.stagingId}`);
          } else {
             throw new Error("Function did not return a valid staging ID.");
          }
        } catch (error: any) {
          console.error("Function call failed:", error);
          toast({ title: "Parsing Failed", description: error.message, variant: "destructive" });
          setUploading(false);
        }
      }
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Parse (Upload Invoice)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You must be signed in as an administrator to use this feature.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Parse (Upload Invoice)</CardTitle>
        <CardDescription>
          Upload an auction invoice to automatically parse vehicle data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invoice-upload">Invoice File</Label>
          <Input id="invoice-upload" type="file" accept="application/pdf" onChange={handleFileChange} disabled={uploading} />
          <p className="text-xs text-muted-foreground">PDF only for MVP (images next).</p>
        </div>
        {uploading && (
          <div className="space-y-2">
            <Label>Upload Progress</Label>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
          ) : (
            <><UploadCloud className="mr-2 h-4 w-4" /> Upload & Parse</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function NewJacketPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <ManualCreateCard />
      <AiParseCard />
    </div>
  );
}

    