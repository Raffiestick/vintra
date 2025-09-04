
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const jacketSchema = z.object({
  jacketId: z.string().min(1, "Jacket ID is required"),
  vin: z.string().min(1, "VIN is required"),
  year: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear() + 1, "Invalid year"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  auctionInvoiceTotal: z.coerce.number().min(0, "Auction total must be a positive number"),
});

type JacketFormValues = z.infer<typeof jacketSchema>;

export default function NewJacketPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<JacketFormValues>({
    resolver: zodResolver(jacketSchema),
    defaultValues: {
      jacketId: "",
      vin: "",
      year: undefined,
      make: "",
      model: "",
      auctionInvoiceTotal: undefined,
    },
  });

  const onSubmit = async (data: JacketFormValues) => {
    setLoading(true);
    try {
      await addDoc(collection(db, "jackets"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      toast({
        title: "Success",
        description: "New jacket has been created successfully.",
      });
      form.reset();
      router.push("/admin/dealer-management"); // Or wherever you want to redirect
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

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Create New Jacket</CardTitle>
        <CardDescription>
          Fill out the form below to create a new vehicle jacket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="jacketId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jacket ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="Vehicle Identification Number" {...field} />
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
                      <Input type="number" placeholder="e.g., 2023" {...field} />
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
                      <Input placeholder="e.g., Toyota" {...field} />
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
                      <Input placeholder="e.g., Camry" {...field} />
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
                    <FormLabel>Auction Invoice Total ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 15000.00" {...field} />
                    </FormControl>
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
