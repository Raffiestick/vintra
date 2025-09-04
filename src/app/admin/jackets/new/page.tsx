
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db, functions } from "@/lib/firebase/client";
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { httpsCallable } from 'firebase/functions';
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
import { FileScan, Pencil } from "lucide-react";

// Updated Zod schema for the form
const jacketSchema = z.object({
  vin: z.string().length(17, "VIN must be 17 characters"),
  year: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear() + 1, "Invalid year"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().min(1, "Color is required"),
  odometer: z.coerce.number().min(0, "Odometer must be a positive number"),
  titleState: z.string().min(1, "Title state is required"),
  titleNumber: z.string().min(1, "Title number is required"),
  auctionInvoiceTotal: z.coerce.number().min(0, "Auction total must be a positive number"),
  dealerId: z.string().min(1, "Dealer assignment is required"),
});

type JacketFormValues = z.infer<typeof jacketSchema>;

interface Dealer {
  id: string;
  companyName: string;
}

export default function NewJacketPage() {
  const [view, setView] = useState<"options" | "form">("options");
  const [loading, setLoading] = useState(false);
  const [approvedDealers, setApprovedDealers] = useState<Dealer[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  // Fetch approved dealers for the dropdown
  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const q = query(collection(db, "users"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        const dealers: Dealer[] = [];
        querySnapshot.forEach((doc) => {
          // Assuming dealers have a companyName field
          dealers.push({ id: doc.id, companyName: doc.data().companyName || "Unnamed Dealer" });
        });
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

  const form = useForm<JacketFormValues>({
    resolver: zodResolver(jacketSchema),
  });

  const onSubmit = async (data: JacketFormValues) => {
    setLoading(true);
    try {
      // 1. Call generateJacketId cloud function
      const generateJacketId = httpsCallable(functions, 'generateJacketId');
      const result: any = await generateJacketId();
      const jacketId = result.data.jacketId;

      if (!jacketId) {
        throw new Error("Failed to generate a valid Jacket ID.");
      }

      // 2. Create new document in `jackets` with VIN as the ID
      const jacketRef = doc(db, "jackets", data.vin);
      await setDoc(jacketRef, {
        ...data,
        jacketId,
        createdAt: Timestamp.now(),
      });
      
      toast({
        title: "Success",
        description: "New jacket has been created successfully.",
      });

      // 3. Redirect to the new jacket detail page
      router.push(`/jacket/preview/${data.vin}`);
      
    } catch (error: any) {
      console.error("Error creating jacket:", error);
      toast({
        title: "Error",
        description: `Failed to create jacket: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (view === "options") {
    return (
       <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Create New Jacket</CardTitle>
          <CardDescription>
            Choose a method to create a new vehicle jacket.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
           <Card className="flex flex-col items-center justify-center p-8 text-center hover:bg-accent hover:text-accent-foreground transition-colors cursor-not-allowed opacity-50">
            <FileScan className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold">Upload Invoice (AI Assist)</h3>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-8 text-center hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" onClick={() => setView("form")}>
            <Pencil className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-semibold">Create Jacket Manually</h3>
            <p className="text-sm text-muted-foreground">Enter all vehicle details by hand.</p>
          </Card>
        </CardContent>
       </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Create New Jacket Manually</CardTitle>
        <CardDescription>
          Fill out the form below to create a new vehicle jacket.
          <Button variant="link" onClick={() => setView("options")} className="px-1">Go Back</Button>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField control={form.control} name="vin" render={({ field }) => ( <FormItem><FormLabel>VIN</FormLabel><FormControl><Input placeholder="Vehicle Identification Number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="year" render={({ field }) => ( <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2023" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Toyota" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Camry" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="color" render={({ field }) => ( <FormItem><FormLabel>Color</FormLabel><FormControl><Input placeholder="e.g., Super White" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="odometer" render={({ field }) => ( <FormItem><FormLabel>Odometer</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="titleState" render={({ field }) => ( <FormItem><FormLabel>Title State</FormLabel><FormControl><Input placeholder="e.g., WY" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="titleNumber" render={({ field }) => ( <FormItem><FormLabel>Title Number</FormLabel><FormControl><Input placeholder="e.g., 123456789" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="auctionInvoiceTotal" render={({ field }) => ( <FormItem><FormLabel>Auction Invoice Total ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 15000.00" {...field} /></FormControl><FormMessage /></FormItem> )} />
              
              <FormField
                control={form.control}
                name="dealerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Dealer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an approved dealer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {approvedDealers.length > 0 ? (
                           approvedDealers.map((dealer) => (
                            <SelectItem key={dealer.id} value={dealer.id}>
                              {dealer.companyName}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No approved dealers found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Jacket"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
