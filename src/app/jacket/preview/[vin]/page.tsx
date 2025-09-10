
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MiscFee {
    description: string;
    amount: number;
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
  isMgmtFeePaid?: boolean;
  itemPrice?: number;
  buyerFee?: number;
  onlineFee?: number;
  managementFee?: number;
  miscFees?: MiscFee[];
  creatorId?: string;
  dealerId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function JacketDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl space-y-8">
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
  const vinParam = params?.vin;
  const vin = useMemo(
    () => (Array.isArray(vinParam) ? vinParam[0] : vinParam),
    [vinParam]
  );

  const { toast } = useToast();
  const { user, isAdmin } = useAuth(); 

  const [jacket, setJacket] = useState<Jacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<"auction" | "mgmt" | null>(null);

  // State for the misc fee form
  const [feeDescription, setFeeDescription] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeError, setFeeError] = useState("");
  const [isAddingFee, setIsAddingFee] = useState(false);


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
          setJacket({ vin: docSnap.id, ...docSnap.data() } as Jacket);
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

    return () => unsubscribe();
  }, [vin]);

  const handleStatusChange = useCallback(
    async (field: "isAuctionPaid" | "isMgmtFeePaid", value: boolean) => {
      if (!vin || !user || !isAdmin) return;

      const updatingType = field === "isAuctionPaid" ? "auction" : "mgmt";
      setIsUpdating(updatingType);

      const jacketDocRef = doc(db, "jackets", vin);
      const originalValue = jacket?.[field] ?? false;

      try {
        await updateDoc(jacketDocRef, {
          [field]: value,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Status Updated",
          description: `Jacket payment status has been successfully updated.`,
        });
      } catch (err: any) {
        console.error("Failed to update jacket:", err);
        setJacket((prev) => (prev ? { ...prev, [field]: originalValue } : null));
        toast({
          title: "Update Failed",
          description:
            err.message || "An error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(null);
      }
    },
    [vin, user, isAdmin, jacket, toast]
  );
  
  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

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
        const jacketDocRef = doc(db, "jackets", vin as string);
        await updateDoc(jacketDocRef, {
            miscFees: arrayUnion(newFee),
            updatedAt: Timestamp.fromDate(new Date()),
        });
        toast({ title: "Fee Added", description: "The miscellaneous fee has been added." });
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


  const fmtCurrency = (n?: number): string => {
    if (n === null || typeof n === "undefined") {
      return "$0.00";
    }
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

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
    const outstanding =
      (jacket.isAuctionPaid ? 0 : auctionDue) +
      (jacket.isMgmtFeePaid ? 0 : mgmtDue) +
      miscTotal; 
    return { auctionDue, mgmtDue, miscTotal, subtotal, outstanding };
  }, [jacket]);

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

  const PaymentSwitch = ({
    id,
    label,
    checked,
    updating,
  }: {
    id: "isAuctionPaid" | "isMgmtFeePaid";
    label: string;
    checked: boolean;
    updating: boolean;
  }) => (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger disabled={!isAdmin} asChild>
          <div className="flex items-center space-x-3">
            {updating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Switch
                id={id}
                checked={checked}
                onCheckedChange={(val) => handleStatusChange(id, val)}
                disabled={!isAdmin || isUpdating !== null}
                aria-readonly={!isAdmin}
              />
            )}
            <Label htmlFor={id} className="text-base">
              {label}
            </Label>
          </div>
        </TooltipTrigger>
        {!isAdmin && (
          <TooltipContent>
            <p>Admin only</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8 gap-8">
      <div className="w-full max-w-4xl space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold">
                  {jacket.year || ""} {jacket.make || "Unknown"}{" "}
                  {jacket.model || "Vehicle"}
                </CardTitle>
                <CardDescription>
                  VIN: <span className="font-mono">{jacket.vin}</span>
                </CardDescription>
              </div>
              {jacket.jacketId && (
                <Badge variant="secondary" className="text-lg">
                  Jacket ID: {jacket.jacketId}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 text-sm">
            <div>
              <strong className="block text-muted-foreground">Color</strong>
              {jacket.color || "N/A"}
            </div>
            <div>
              <strong className="block text-muted-foreground">Odometer</strong>
              {jacket.odometer ? jacket.odometer.toLocaleString() : "N/A"}
            </div>
            <div>
              <strong className="block text-muted-foreground">
                Auction Date
              </strong>
              {jacket.auctionSaleDate
                ? jacket.auctionSaleDate.toDate().toLocaleDateString()
                : "N/A"}
            </div>
             <div>
                <strong className="block text-muted-foreground">Created</strong>
                {jacket.createdAt ? jacket.createdAt.toDate().toLocaleDateString() : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-8">
            <PaymentSwitch
              id="isAuctionPaid"
              label="Auction Paid"
              checked={jacket.isAuctionPaid ?? false}
              updating={isUpdating === "auction"}
            />
            <PaymentSwitch
              id="isMgmtFeePaid"
              label="Management Fee Paid"
              checked={jacket.isMgmtFeePaid ?? false}
              updating={isUpdating === "mgmt"}
            />
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Misc Fees</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {(!jacket.miscFees || jacket.miscFees.length === 0) ? (
                        <p className="text-sm text-muted-foreground">No misc fees yet.</p>
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
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {financials && (
           <Card>
             <CardHeader>
               <CardTitle>Financials</CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                <div><strong className="block text-muted-foreground">Item Price</strong> {fmtCurrency(jacket.itemPrice)}</div>
                <div><strong className="block text-muted-foreground">Buyer Fee</strong> {fmtCurrency(jacket.buyerFee)}</div>
                <div><strong className="block text-muted-foreground">Online Fee</strong> {fmtCurrency(jacket.onlineFee)}</div>
                <div className="font-bold"><strong className="block text-muted-foreground">Auction Due</strong> {fmtCurrency(financials.auctionDue)}</div>
                
                <div><strong className="block text-muted-foreground">Mgmt Fee</strong> {fmtCurrency(jacket.managementFee)}</div>
                <div className="font-bold"><strong className="block text-muted-foreground">Mgmt Due</strong> {fmtCurrency(financials.mgmtDue)}</div>

                <div className="font-bold text-primary"><strong className="block text-muted-foreground">Misc Total</strong> {fmtCurrency(financials.miscTotal)}</div>
                <div className="font-bold"><strong className="block text-muted-foreground">Subtotal</strong> {fmtCurrency(financials.subtotal)}</div>
                <div className="col-span-full md:col-span-1 text-lg font-bold text-destructive"><strong className="block text-muted-foreground">Total Outstanding</strong> {fmtCurrency(financials.outstanding)}</div>
             </CardContent>
           </Card>
        )}
      </div>
    </main>
  );
}
