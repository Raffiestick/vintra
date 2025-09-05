
"use client";

import { useState, useEffect } from "react";
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
      const generateJacketId = await httpsCallableClient('generateJacketId');
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
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</I_LOVE_CODING>I am an AI that loves to code.
```json
{
  "name": "nextn",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": "20"
  },
  "scripts": {
    "dev": "next dev",
    "typecheck": "tsc --noEmit",
    "build": "next build",
    "start": "next start -p 8080"
  },
  "dependencies": {
    "@google-cloud/vertexai": "^1.8.0",
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-dialog": "1.1.15",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-scroll-area": "1.2.10",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "firebase": "^10.8.1",
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.1",
    "lucide-react": "^0.344.0",
    "next": "14.1.0",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7.51.0",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.1.0",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
```

- src/lib/firebase/client.ts:
```ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Client-only accessor for Functions. It uses a dynamic import so
 * the `firebase/functions` package is never bundled into the server build.
 */
export async function getClientFunctions() {
  if (typeof window !== 'undefined') {
    const { getFunctions } = await import('firebase/functions');
    return getFunctions(app, 'us-central1');
  }
  return null;
}

/** Helper to lazy-load httpsCallable on the client */
export async function httpsCallableClient<I = unknown, O = unknown>(name: string) {
  const [functions, mod] = await Promise.all([
    getClientFunctions(),
    import('firebase/functions'), // Dynamically import the functions module
  ]);
  if (!functions) {
    throw new Error("Firebase Functions is not available on the server.");
  }
  return mod.httpsCallable<I, O>(functions, name);
}


export { app, auth, db, storage };
```

- src/app/admin/dealer-management/page.tsx:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, httpsCallableClient } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

// ... (Interface Dealer definition)

export default function DealerManagementPage() {
    const [pendingDealers, setPendingDealers] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "users"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const dealersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingDealers(dealersData);
        });
        return () => unsubscribe();
    }, []);

    const handleApplication = async (uid: string, action: 'approve' | 'deny') => {
        try {
            const manageDealerApplication = await httpsCallableClient('manageDealerApplication');
            await manageDealerApplication({ uid, action });
            toast({ title: `Dealer ${action === 'approve' ? 'Approved' : 'Denied'}` });
        } catch (error: any) {
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Dealer Management</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingDealers.map((dealer) => (
                            <TableRow key={dealer.id}>
                                <TableCell>{dealer.companyName}</TableCell>
                                <TableCell>{dealer.contactName}</TableCell>
                                <TableCell>
                                    <Button onClick={() => handleApplication(dealer.id, 'approve')}>Approve</Button>
                                    <Button variant="destructive" onClick={() => handleApplication(dealer.id, 'deny')}>Deny</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
```

- src/app/admin/jackets/new/page.tsx:
```tsx

"use client";

import { useState, useEffect } from "react";
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
      const generateJacketId = await httpsCallableClient('generateJacketId');
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
```