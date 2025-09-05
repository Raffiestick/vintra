
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db, httpsCallableClient } from "@/lib/firebase/client";
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { FileScan, Pencil, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const jacketSchema = z.object({
  vin: z.string().length(17, "VIN must be 17 characters"),
  year: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear() + 1, "Invalid year"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().min(1, "Color is required"),
  odometer: z.coerce.number().min(0, "Odometer must be a positive number"),
  engine: z.string().min(1, "Engine is required"),
  length: z.string().min(1, "Length is required"),
  titleState: z.string().min(1, "Title state is required"),
  titleNumber: z.string().min(1, "Title number is required"),
  saleLocation: z.string().min(1, "Sale location is required"),
  itemPrice: z.coerce.number().min(0, "Item price must be a positive number"),
  buyerFee: z.coerce.number().min(0, "Buyer fee must be a positive number"),
  onlineFee: z.coerce.number().min(0, "Online fee must be a positive number"),
  managementFee: z.coerce.number().min(0, "Management fee must be a positive number"),
  auctionInvoiceTotal: z.coerce.number().min(0, "Auction total must be a positive number"),
  dealerId: z.string().min(1, "Dealer assignment is required"),
});

type JacketFormValues = z.infer<typeof jacketSchema>;

interface Dealer {
  id: string;
  companyName: string;
}

export default function NewJacketPage() {
  const [view, setView] = useState<"options" | "form" | "upload">("options");
  const [loading, setLoading] = useState(false);
  const [approvedDealers, setApprovedDealers] = useState<Dealer[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<JacketFormValues>({
    resolver: zodResolver(jacketSchema),
    defaultValues: {
      vin: "",
      make: "",
      model: "",
      color: "",
      engine: "",
      length: "",
      titleState: "",
      titleNumber: "",
      saleLocation: "",
      dealerId: "",
      year: "" as any,
      odometer: "" as any,
      itemPrice: 0,
      buyerFee: 0,
      onlineFee: 0,
      managementFee: 0,
      auctionInvoiceTotal: 0,
    }
  });

  const { watch, setValue } = form;
  const itemPrice = watch("itemPrice");
  const buyerFee = watch("buyerFee");
  const onlineFee = watch("onlineFee");
  const managementFee = watch("managementFee");

  useEffect(() => {
    const total = (Number(itemPrice) || 0) + (Number(buyerFee) || 0) + (Number(onlineFee) || 0) + (Number(managementFee) || 0);
    setValue("auctionInvoiceTotal", total, { shouldValidate: true });
  }, [itemPrice, buyerFee, onlineFee, managementFee, setValue]);


  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const q = query(collection(db, "users"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        const dealers: Dealer[] = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          companyName: doc.data().companyName || "Unnamed Dealer" 
        }));
        setApprovedDealers(dealers);
      } catch (error) {
        console.error("Error fetching dealers:", error);
        toast({
          title: "Error",
          description: "Could not load the list of approved dealers.",
          variant: "destructive",
        });
      }
    };
    fetchDealers();
  }, [toast]);

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleInvoiceUpload = useCallback(async () => {
    if (!invoiceFile) {
      toast({ title: "Please select an invoice file first.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setIsParsing(true);
    setUploadProgress(30);

    try {
      const dataUri = await fileToDataUri(invoiceFile);
      setUploadProgress(60);

      const parseAuctionInvoice = await httpsCallableClient<{ invoiceDataUri: string }, any>('parseAuctionInvoice');
      const result = await parseAuctionInvoice({ invoiceDataUri: dataUri });

      setUploadProgress(100);
      toast({ title: "Invoice Parsed", description: "Vehicle details have been pre-filled." });

      const { vin, year, make, model } = result.data;
      form.reset({
        ...form.getValues(),
        vin: vin || "",
        year: year || "",
        make: make || "",
        model: model || "",
      });
      setView("form");
    } catch (error: any) {
      console.error("Error parsing invoice:", error);
      toast({
        title: "AI Parsing Failed",
        description: `Could not parse the invoice: ${error.message}. Please enter details manually.`,
        variant: "destructive",
      });
      setView("form");
    } finally {
      setUploading(false);
      setIsParsing(false);
      setUploadProgress(0);
    }
  }, [invoiceFile, form, toast]);

  const onSubmit = async (data: JacketFormValues) => {
    setLoading(true);
    try {
      const generateJacketId = await httpsCallableClient('generateJacketId');
      const result: any = await generateJacketId({});
      const jacketId = result.data.jacketId;

      if (!jacketId) throw new Error("Failed to generate a valid Jacket ID.");

      const jacketRef = doc(db, "jackets", data.vin);
      await setDoc(jacketRef, { ...data, jacketId, createdAt: Timestamp.now() });
      
      toast({ title: "Success", description: "New jacket created successfully." });
      router.push(`/jacket/preview/${data.vin}`);
    } catch (error: any) {
      console.error("Error creating jacket:", error);
      toast({ title: "Error", description: `Failed to create jacket: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const renderContent = () => {
    switch (view) {
      case "options":
        return (
          <CardContent className="grid md:grid-cols-2 gap-6">
            <Card className="flex flex-col items-center justify-center p-8 text-center hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" onClick={() => setView("upload")}>
              <FileScan className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-semibold">Upload Invoice (AI Assist)</h3>
              <p className="text-sm text-muted-foreground">Extract details automatically.</p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-8 text-center hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" onClick={() => setView("form")}>
              <Pencil className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-semibold">Create Jacket Manually</h3>
              <p className="text-sm text-muted-foreground">Enter all vehicle details by hand.</p>
            </Card>
          </CardContent>
        );
      case "upload":
        return (
          <CardContent className="flex flex-col items-center gap-4">
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setInvoiceFile(e.target.files ? e.target.files[0] : null)} disabled={uploading} />
            {uploading && <Progress value={uploadProgress} className="w-full" />}
            {isParsing && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> AI is parsing your document, please wait...</p>}
            <div className="flex gap-4">
              <Button onClick={handleInvoiceUpload} disabled={!invoiceFile || uploading}>
                {uploading ? "Uploading..." : "Upload & Parse"}
              </Button>
              <Button variant="outline" onClick={() => setView("options")}>Cancel</Button>
            </div>
          </CardContent>
        );
      case "form":
        return (
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <FormField control={form.control} name="vin" render={({ field }) => ( <FormItem><FormLabel>VIN</FormLabel><FormControl><Input placeholder="Vehicle Identification Number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="year" render={({ field }) => ( <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2023" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Toyota" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Camry" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="color" render={({ field }) => ( <FormItem><FormLabel>Color</FormLabel><FormControl><Input placeholder="e.g., Super White" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="odometer" render={({ field }) => ( <FormItem><FormLabel>Odometer</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="engine" render={({ field }) => ( <FormItem><FormLabel>Engine</FormLabel><FormControl><Input placeholder="e.g., 2.5L 4-Cylinder" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="length" render={({ field }) => ( <FormItem><FormLabel>Length</FormLabel><FormControl><Input placeholder="e.g., 192.1 in" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="titleState" render={({ field }) => ( <FormItem><FormLabel>Title State</FormLabel><FormControl><Input placeholder="e.g., WY" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="titleNumber" render={({ field }) => ( <FormItem><FormLabel>Title Number</FormLabel><FormControl><Input placeholder="e.g., 123456789" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="saleLocation" render={({ field }) => ( <FormItem><FormLabel>Sale Location</FormLabel><FormControl><Input placeholder="e.g., Dallas, TX" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="itemPrice" render={({ field }) => ( <FormItem><FormLabel>Item Price ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 12000.00" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="buyerFee" render={({ field }) => ( <FormItem><FormLabel>Buyer Fee ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 500.00" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="onlineFee" render={({ field }) => ( <FormItem><FormLabel>Online Fee ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="managementFee" render={({ field }) => ( <FormItem><FormLabel>Management Fee ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 250.00" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="auctionInvoiceTotal" render={({ field }) => ( <FormItem><FormLabel>Auction Invoice Total ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value?.toFixed(2)} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="dealerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Dealer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select an approved dealer" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedDealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.companyName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Jacket"}
                </Button>
              </form>
            </Form>
          </CardContent>
        );
    }
  };

  const getTitle = () => {
    switch (view) {
      case "options": return "Create New Jacket";
      case "upload": return "Upload Invoice";
      case "form": return "Create New Jacket Manually";
    }
  };

  const getDescription = () => {
    switch (view) {
      case "options": return "Choose a method to create a new vehicle jacket.";
      case "upload": return "Select an invoice file to be parsed by AI.";
      case "form": return (
        <>
          Fill out the form below to create a new vehicle jacket.
          <Button variant="link" onClick={() => setView("options")} className="px-1">Go Back</Button>
        </>
      );
    }
  };

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      {renderContent()}
    </Card>
  );
}
