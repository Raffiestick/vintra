
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Timestamp,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Loader2, Info, ChevronsUpDown, Check } from "lucide-react";

const jacketFormSchema = z.object({
  vin: z.string().min(6, "VIN must be at least 6 characters"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().optional(),
  odometer: z.coerce.number().min(0).optional(),
  itemPrice: z.coerce.number().min(0),
  buyerFee: z.coerce.number().min(0),
  onlineFee: z.coerce.number().min(0),
  managementFee: z.coerce.number().min(0).default(100),
  auctionInvoiceTotal: z.coerce.number().min(0),
  titleState: z.string().length(2, "State must be 2 characters").optional(),
  titleNumber: z.string().optional(),
  dealerId: z.string().optional(),
});

type JacketFormValues = z.infer<typeof jacketFormSchema>;

interface ApprovedDealer {
  uid: string;
  companyName: string;
}

export default function NewJacketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { user } = useAuth();

  const [approvedDealers, setApprovedDealers] = useState<ApprovedDealer[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const form = useForm<JacketFormValues>({
    resolver: zodResolver(jacketFormSchema),
    defaultValues: {
      managementFee: 100,
    },
  });

  useEffect(() => {
    async function fetchDealers() {
      try {
        const q = query(
          collection(db, "users"),
          where("status", "==", "approved")
        );
        const querySnapshot = await getDocs(q);
        const dealers = querySnapshot.docs.map(
          (doc) =>
            ({
              uid: doc.id,
              companyName: doc.data().companyName || "N/A",
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
  }, [toast]);

  const onSubmit = async (data: JacketFormValues) => {
    setSubmitError("");
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a jacket.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const normalizedVin = data.vin.trim().toUpperCase();
    const jacketRef = doc(db, "jackets", normalizedVin);

    try {
      const docSnap = await getDoc(jacketRef);
      if (docSnap.exists()) {
        form.setError("vin", { message: "VIN already exists." });
        setLoading(false);
        return;
      }

      const payload = {
        ...data,
        jacketId: `J${Date.now()}`,
        vin: normalizedVin,
        auctionSaleDate: Timestamp.fromDate(new Date()), // using now, can be edited later
        isAuctionPaid: false,
        isMgmtFeePaid: false,
        miscFees: [],
        documents: [],
        invoiceUrl: "",
        creatorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(jacketRef, payload, { merge: false });

      toast({ title: "Success!", description: "Jacket created successfully." });
      // TODO: Add "Save & Generate Invoice" logic
      router.push(`/admin/jackets/${normalizedVin}`);
    } catch (error: any) {
      console.error("Error creating jacket:", error);
      const errorMessage = error?.message || "An unexpected error occurred.";
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
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Create New Jacket</h1>
              <p className="text-muted-foreground">
                Manually enter the details for a new vehicle jacket.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" disabled={loading}>
                {loading ? "Saving..." : "Save Draft"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save & Continue
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>VIN</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="odometer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odometer</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Title Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="titleState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title State</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., FL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="titleNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="itemPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="buyerFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyer Fee</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="onlineFee"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="flex items-center gap-1">
                          Online Fee
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Fee for online auction participation.</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="managementFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Management Fee</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="auctionInvoiceTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auction Invoice Total</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dealer Assignment</CardTitle>
                  <CardDescription>Optional</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="dealerId"
                    render={({ field }) => (
                      <FormItem>
                        <Popover
                          open={comboboxOpen}
                          onOpenChange={setComboboxOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? approvedDealers.find(
                                      (d) => d.uid === field.value
                                    )?.companyName
                                  : "Select dealer"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search dealers..." />
                              <CommandEmpty>No dealers found.</CommandEmpty>
                              <CommandGroup>
                                {approvedDealers.map((dealer) => (
                                  <CommandItem
                                    value={dealer.companyName}
                                    key={dealer.uid}
                                    onSelect={() => {
                                      form.setValue("dealerId", dealer.uid);
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        dealer.uid === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {dealer.companyName}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
        </form>
      </Form>
    </TooltipProvider>
  );
}

    