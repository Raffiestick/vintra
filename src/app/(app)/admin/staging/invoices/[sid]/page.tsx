"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, collection, onSnapshot, Unsubscribe, DocumentData } from "firebase/firestore";
import { db, functions } from "@/lib/firebase/client";
import { httpsCallable } from "firebase/functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const processStagedUnit = httpsCallable(functions, "processStagedUnit");

// A self-contained component to manage each unit's state
function StagedUnit({ unitData, unitId, sid }: { unitData: DocumentData, unitId: string, sid: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState(unitData);
  const [isLoading, setIsLoading] = useState(false);

  const onChange = (key: string, value: any) => {
    setState((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleProcess = async () => {
    setIsLoading(true);
    try {
      const payload = { sid, unitId, updates: state };
      const result: any = await processStagedUnit(payload);
      
      toast({ title: "Success!", description: `Jacket ${result.data.jacketId} created.` });
      router.push(`/admin/jackets/${result.data.jacketId}`);

    } catch (error: any) {
      console.error("Failed to process unit:", error);
      toast({ variant: 'destructive', title: "Processing Error", description: error.message });
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Unit: {unitData.vinOrHin || "(no VIN/HIN)"}
            {unitData.processed && <span className="text-green-600 ml-2 font-normal text-base">✓ Processed</span>}
          </CardTitle>
          {!unitData.processed && (
            <Button size="sm" onClick={handleProcess} disabled={isLoading}>
              <Loader2 className={`mr-2 h-4 w-4 animate-spin ${!isLoading && 'hidden'}`} />
              Process to Jacket
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(state).map(([key, value]) => {
            // Exclude non-editable fields
            if (['processed', 'createdAt', 'processedAt'].includes(key)) return null;

            const isNumeric = ['year', 'odometer', 'hours', 'lengthFeet', 'itemPrice', 'buyerFee', 'onlineFee', 'managementFee'].includes(key);

            return (
              <div key={key}>
                <Label className="capitalize text-xs">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                <Input
                  type={isNumeric ? 'number' : 'text'}
                  value={value || ''}
                  onChange={e => onChange(key, e.target.value)}
                  disabled={unitData.processed}
                />
              </div>
            );
          })}
        </div>

        {unitData.rawSnippet && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:underline">
              View Raw Snippet
            </summary>
            <pre className="mt-2 p-3 bg-slate-50 rounded-md text-xs text-slate-700 whitespace-pre-wrap">
              {unitData.rawSnippet}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}


export default function StagingInvoiceDetailPage() {
  const params = useParams<{ sid: string }>();
  const sid = params.sid;

  const [invoice, setInvoice] = useState<DocumentData | null>(null);
  const [units, setUnits] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sid) return;

    const docRef = doc(db, "stagingInvoices", sid);
    const unsubDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setInvoice(docSnap.data());
      } else {
        console.error("No such invoice!");
      }
    });

    const unitsRef = collection(db, "stagingInvoices", sid, "units");
    const unsubUnits = onSnapshot(unitsRef, (querySnapshot) => {
      const unitsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUnits(unitsData);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubDoc();
      unsubUnits();
    };
  }, [sid]);

  if (loading) {
    return <div className="container mx-auto py-8 text-center">Loading Staging Details...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Staging Invoice</CardTitle>
          <CardDescription>
            Invoice Date: {invoice?.invoiceDate || "-"} · 
            Invoice #: {invoice?.invoiceNumber || "-"} · 
            Units: {invoice?.unitCount ?? "-"}
          </CardDescription>
          {invoice?.invoiceUrl && (
            <div className="pt-2">
              <Link href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                View Original Uploaded Invoice
              </Link>
            </div>
          )}
        </CardHeader>
      </Card>
      
      <div className="space-y-4">
        {units.map((unit) => (
          <StagedUnit key={unit.id} unitData={unit} unitId={unit.id} sid={sid} />
        ))}
      </div>
    </div>
  );
}